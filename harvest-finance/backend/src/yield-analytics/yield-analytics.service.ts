import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import {
  SorobanEvent,
  SorobanEventType,
} from '../database/entities/soroban-event.entity';
import { YieldAnalytics } from '../database/entities/yield-analytics.entity';

export interface HardWorkEvent {
  contractId: string;
  totalAssets: string;
  totalShares: string;
  timestamp: Date;
  transactionHash: string;
}

export interface YieldAnalyticsData {
  contractId: string;
  date: Date;
  totalAssets: string;
  totalShares: string;
  hardworkEventsCount: number;
  sevenDayApy: number | null;
  dailyApy: number | null;
  pricePerShare: string;
  pricePerSharePrevious: string | null;
  volume24h: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class YieldAnalyticsService {
  private readonly logger = new Logger(YieldAnalyticsService.name);

  constructor(
    @InjectRepository(YieldAnalytics)
    private readonly yieldAnalyticsRepository: Repository<YieldAnalytics>,
    @InjectRepository(SorobanEvent)
    private readonly sorobanEventRepository: Repository<SorobanEvent>,
  ) {}

  /**
   * Process HardWork events from Soroban contracts and calculate yield analytics
   */
  async processHardWorkEvents(): Promise<void> {
    try {
      // Find unprocessed HardWork events from the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const hardworkEvents = await this.findHardWorkEvents(twentyFourHoursAgo);

      if (hardworkEvents.length === 0) {
        this.logger.log('No new HardWork events to process');
        return;
      }

      // Group events by contract ID
      const eventsByContract = this.groupEventsByContract(hardworkEvents);

      // Process each contract's events
      for (const [contractId, events] of eventsByContract.entries()) {
        await this.processContractEvents(contractId, events);
      }

      this.logger.log(`Processed ${hardworkEvents.length} HardWork events`);
    } catch (error) {
      this.logger.error('Error processing HardWork events:', error);
      throw error;
    }
  }

  /**
   * Find HardWork events from Soroban contract events
   */
  private async findHardWorkEvents(since: Date): Promise<HardWorkEvent[]> {
    const events = await this.sorobanEventRepository.find({
      where: {
        type: SorobanEventType.CONTRACT,
        ledgerClosedAt: MoreThanOrEqual(since),
      },
      order: { ledgerClosedAt: 'ASC' },
    });

    return events
      .filter((event) => this.isHardWorkEvent(event))
      .map((event) => this.parseHardWorkEvent(event));
  }

  /**
   * Check if a Soroban event is a HardWork event
   */
  private isHardWorkEvent(event: SorobanEvent): boolean {
    if (!event.topics || event.topics.length === 0) return false;
    if (event.topics[0] !== 'HardWork') return false;
    if (!event.value || typeof event.value !== 'object') return false;
    const val = event.value as Record<string, unknown>;
    return 'totalAssets' in val && 'totalShares' in val;
  }

  /**
   * Parse HardWork event data
   */
  private parseHardWorkEvent(event: SorobanEvent): HardWorkEvent {
    const value = event.value as any;
    return {
      contractId: event.contractId!,
      totalAssets: value.totalAssets?.toString() || '0',
      totalShares: value.totalShares?.toString() || '0',
      timestamp: event.ledgerClosedAt,
      transactionHash: event.transactionHash || '',
    };
  }

  /**
   * Group events by contract ID
   */
  private groupEventsByContract(
    events: HardWorkEvent[],
  ): Map<string, HardWorkEvent[]> {
    const grouped = new Map<string, HardWorkEvent[]>();

    for (const event of events) {
      if (!grouped.has(event.contractId)) {
        grouped.set(event.contractId, []);
      }
      grouped.get(event.contractId)!.push(event);
    }

    return grouped;
  }

  /**
   * Process events for a specific contract
   */
  private async processContractEvents(
    contractId: string,
    events: HardWorkEvent[],
  ): Promise<void> {
    // Get the latest event for today's analytics
    const latestEvent = events[events.length - 1];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate price per share
    const totalAssets = BigInt(latestEvent.totalAssets);
    const totalShares = BigInt(latestEvent.totalShares);
    const pricePerShare =
      totalShares > 0n ? (totalAssets * 10n ** 18n) / totalShares : 0n;

    // Get previous day's price per share for APY calculation
    const previousDay = new Date(today);
    previousDay.setDate(previousDay.getDate() - 1);

    const previousAnalytics = await this.yieldAnalyticsRepository.findOne({
      where: {
        contractId,
        date: previousDay,
      },
    });

    const pricePerSharePrevious = previousAnalytics
      ? BigInt(previousAnalytics.pricePerShare)
      : null;

    // Calculate daily APY
    const dailyApy = this.calculateDailyApy(
      pricePerShare,
      pricePerSharePrevious,
    );

    // Calculate 7-day rolling APY
    const sevenDayApy = await this.calculateSevenDayRollingApy(
      contractId,
      today,
    );

    // Calculate 24h volume (sum of all HardWork events in last 24h)
    const volume24h = events.reduce((sum, event) => {
      return sum + BigInt(event.totalAssets);
    }, 0n);

    // Create or update yield analytics record
    const analyticsData: Partial<YieldAnalytics> = {
      contractId,
      date: today,
      totalAssets: totalAssets.toString(),
      totalShares: totalShares.toString(),
      hardworkEventsCount: events.length,
      sevenDayApy,
      dailyApy,
      pricePerShare: pricePerShare.toString(),
      pricePerSharePrevious: pricePerSharePrevious?.toString() || null,
      volume24h: volume24h.toString(),
      updatedAt: new Date(),
    };

    await this.yieldAnalyticsRepository.upsert(analyticsData, [
      'contractId',
      'date',
    ]);

    this.logger.log(
      `Updated yield analytics for contract ${contractId}: ` +
        `7-day APY: ${sevenDayApy?.toFixed(2)}%, Daily APY: ${dailyApy?.toFixed(2)}%`,
    );
  }

  /**
   * Calculate daily APY based on price per share change
   */
  private calculateDailyApy(
    currentPrice: bigint,
    previousPrice: bigint | null,
  ): number | null {
    if (!previousPrice || previousPrice === 0n) {
      return null;
    }

    // Calculate daily return as percentage
    // Use floating-point division for more precise daily return calculation
    const dailyReturn =
      (Number(currentPrice) / Number(previousPrice) - 1) * 100;

    // Annualize the daily return by simple annualization (no compounding)
    // APY percent = dailyReturn (%) * 365
    const apyPercent = dailyReturn * 365;

    return Math.round(apyPercent * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate 7-day rolling APY
   */
  private async calculateSevenDayRollingApy(
    contractId: string,
    currentDate: Date,
  ): Promise<number | null> {
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get last 7 days of analytics data
    const analytics =
      (await this.yieldAnalyticsRepository.find({
        where: {
          contractId,
          date: Between(sevenDaysAgo, currentDate),
        },
        order: { date: 'ASC' },
      })) || [];

    if (!analytics || analytics.length < 2) {
      return null;
    }

    // Calculate compound return over 7 days
    const firstPrice = BigInt(analytics[0].pricePerShare);
    const lastPrice = BigInt(analytics[analytics.length - 1].pricePerShare);

    if (firstPrice === 0n) {
      return null;
    }

    const totalReturn =
      Number((lastPrice * 10000n) / firstPrice - 10000n) / 100;

    // Annualize the 7-day return (APY = (1 + total_return)^(365/7) - 1)
    const apy = Math.pow(1 + totalReturn / 100, 365 / 7) - 1;

    return Math.round(apy * 10000) / 100; // Round to 2 decimal places
  }

  /**
   * Get yield analytics for a specific contract
   */
  async getYieldAnalytics(
    contractId: string,
    days: number = 30,
  ): Promise<YieldAnalyticsData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.yieldAnalyticsRepository.find({
      where: {
        contractId,
        date: Between(startDate, new Date()),
      },
      order: { date: 'DESC' },
    });

    return analytics.map((a) => ({
      contractId: a.contractId,
      date: a.date,
      totalAssets: a.totalAssets,
      totalShares: a.totalShares,
      hardworkEventsCount: a.hardworkEventsCount,
      sevenDayApy: a.sevenDayApy,
      dailyApy: a.dailyApy,
      pricePerShare: a.pricePerShare,
      pricePerSharePrevious: a.pricePerSharePrevious,
      volume24h: a.volume24h,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  /**
   * Get current 7-day APY for all contracts
   */
  async getCurrentSevenDayApys(): Promise<
    { contractId: string; apy: number | null }[]
  > {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analytics = await this.yieldAnalyticsRepository.find({
      where: { date: today },
      select: ['contractId', 'sevenDayApy'],
    });

    return analytics.map((a) => ({
      contractId: a.contractId,
      apy: a.sevenDayApy,
    }));
  }
}
