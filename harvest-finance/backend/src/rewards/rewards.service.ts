import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { Vault } from '../database/entities/vault.entity';
import { Reward, RewardStatus } from '../database/entities/reward.entity';
import { calculateDepositReward } from './utils/reward-calculator';
import {
  UserRewardsResponseDto,
  VaultRewardSummaryDto,
  ClaimRewardsResponseDto,
} from './dto/reward-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationHelper } from '../notifications/notification.helper';
import { VaultGateway } from '../realtime/vault.gateway';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
    @InjectRepository(Reward) private rewardRepo: Repository<Reward>,
    private notificationsService: NotificationsService,
    private vaultGateway: VaultGateway,
  ) {}

  async getUserRewards(userId: string): Promise<UserRewardsResponseDto> {
    const deposits = await this.depositRepo.find({
      where: { userId, status: DepositStatus.CONFIRMED },
      relations: ['vault'],
    });

    const vaultMap = new Map<string, VaultRewardSummaryDto>();
    const now = new Date();

    for (const deposit of deposits) {
      if (!deposit.vault) continue;

      const vaultId = deposit.vaultId;
      // interestRate stored as decimal (e.g. 0.08 = 8% APY)
      const apy = Number(deposit.vault.interestRate) * 100;
      const depositDate = deposit.confirmedAt ?? deposit.createdAt;
      const reward = calculateDepositReward(
        Number(deposit.amount),
        apy,
        depositDate,
        now,
      );

      if (!vaultMap.has(vaultId)) {
        vaultMap.set(vaultId, {
          vaultId,
          vaultName: deposit.vault.vaultName,
          totalDeposited: 0,
          totalReward: 0,
          apy,
        });
      }

      const summary = vaultMap.get(vaultId)!;
      summary.totalDeposited = parseFloat(
        (summary.totalDeposited + Number(deposit.amount)).toFixed(8),
      );
      summary.totalReward = parseFloat(
        (summary.totalReward + reward).toFixed(8),
      );
    }

    const byVault = Array.from(vaultMap.values());
    const totalReward = parseFloat(
      byVault.reduce((s, v) => s + v.totalReward, 0).toFixed(8),
    );

    return { userId, totalReward, byVault, calculatedAt: now.toISOString() };
  }

  async claimRewards(
    userId: string,
    vaultId?: string,
  ): Promise<ClaimRewardsResponseDto> {
    const rewardsData = await this.getUserRewards(userId);

    let claimedAmount: number;
    let vaultName = 'All Vaults';
    let asset = '';

    if (vaultId) {
      const vaultSummary = rewardsData.byVault.find(
        (v) => v.vaultId === vaultId,
      );
      if (!vaultSummary) {
        throw new NotFoundException('No rewards found for the specified vault');
      }
      claimedAmount = vaultSummary.totalReward;
      vaultName = vaultSummary.vaultName;

      // Fetch vault for asset info
      const vault = await this.vaultRepo.findOne({ where: { id: vaultId } });
      asset = vault?.type || '';
    } else {
      claimedAmount = rewardsData.totalReward;
    }

    const now = new Date();
    const claimRecord = this.rewardRepo.create({
      userId,
      vaultId: vaultId ?? 'all',
      depositId: 'batch-claim',
      accruedAmount: claimedAmount,
      status: RewardStatus.CLAIMED,
      claimedAt: now,
      lastCalculatedAt: now,
    });
    await this.rewardRepo.save(claimRecord);

    await this.notificationsService.create(
      NotificationHelper.rewardsClaimed({
        userId,
        claimedAmount,
        vaultId,
        vaultName,
      }),
    );

    // Emit real-time event
    this.vaultGateway.emitHarvest({
      vaultId: vaultId ?? 'all',
      vaultName,
      asset,
      amount: claimedAmount,
      userId,
    });

    return {
      userId,
      vaultId: vaultId ?? null,
      claimedAmount: parseFloat(claimedAmount.toFixed(8)),
      claimedAt: now.toISOString(),
    };
  }
}
