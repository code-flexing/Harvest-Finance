import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { DepositEvent, DepositEventType } from '../database/entities/deposit-event.entity';
import { ExternalPaymentEventType } from './dto/external-payment-notification.dto';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';

import { Strategy, CompoundingFrequency, COMPOUNDING_FREQUENCY_N } from '../database/entities/strategy.entity';
import { VaultApyHistory } from '../database/entities/vault-apy-history.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthService } from '../auth/auth.service';

import { VaultReservation } from './entities/vault-reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';

import { DepositDto } from './dto/deposit.dto';
import { BatchDepositDto } from './dto/batch-deposit.dto';
import {
  DepositVaultResponseDto,
  VaultResponseDto,
  DepositResponseDto,
} from './dto/vault-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationHelper } from '../notifications/notification.helper';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';
import { VaultApproval } from '../database/entities/vault-approval.entity';
import { User } from '../database/entities/user.entity';
import { NotificationType } from '../database/entities/notification.entity';
import { DepositEventService } from './deposit-event.service';
import { FeesService } from './fees.service';
import { UpdateVaultFeesDto } from './dto/update-vault-fees.dto';
import { WithdrawalQueueService } from './withdrawal-queue.service';

const MAX_SAFE_DEPOSIT = 1e30;
const LARGE_DEPOSIT_THRESHOLD = 10000;

@Injectable()
export class VaultsService {
  constructor(
    @InjectRepository(Vault)
    private vaultRepository: Repository<Vault>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,

    @InjectRepository(Strategy)
    private strategyRepository: Repository<Strategy>,
    @InjectRepository(VaultApyHistory)
    private apyHistoryRepository: Repository<VaultApyHistory>,

    @InjectRepository(VaultReservation)
    private reservationRepository: Repository<VaultReservation>,

    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private logger: CustomLoggerService,
    private vaultGateway: VaultGateway,
    private contractCache: ContractCacheService,
    private sanitizer: InputSanitizerService,
    private depositEventService: DepositEventService,
    private readonly feesService: FeesService,
    private readonly eventEmitter: EventEmitter2,
    private authService: AuthService,
  ) {}

  /**
   * Calculate APY from APR using the compound interest formula:
   * APY = (1 + APR / n)^n - 1
   *
   * @param apr - Annual Percentage Rate (as a percentage, e.g. 5.5 for 5.5%)
   * @param frequency - Compounding frequency
   * @returns Annual Percentage Yield (as a percentage)
   */
  calculateApy(
    apr: number,
    frequency: CompoundingFrequency | string | null | undefined = CompoundingFrequency.DAILY,
  ): number {
    if (apr === 0) return 0;

    const normalizedFrequency = this.normalizeCompoundingFrequency(frequency);
    const n = COMPOUNDING_FREQUENCY_N[normalizedFrequency];
    const decimalApr = apr / 100;
    const apy = Math.pow(1 + decimalApr / n, n) - 1;

    return Number((apy * 100).toFixed(2));
  }

  /**
   * Get the effective compounding frequency for a vault.
   * Falls back to DAILY if no strategy is assigned or the stored value is invalid.
   */
  private getVaultCompoundingFrequency(vault: Vault): CompoundingFrequency {
    return this.normalizeCompoundingFrequency(vault.strategy?.compoundingFrequency);
  }

  private normalizeCompoundingFrequency(
    frequency: CompoundingFrequency | string | null | undefined,
  ): CompoundingFrequency {
    if (frequency === CompoundingFrequency.WEEKLY) {
      return CompoundingFrequency.WEEKLY;
    }
    if (frequency === CompoundingFrequency.MONTHLY) {
      return CompoundingFrequency.MONTHLY;
    }
    return CompoundingFrequency.DAILY;
  }

  async getVaultById(vaultId: string): Promise<Vault> {
    // Sanitize and validate vault ID
    const sanitizedVaultId = this.sanitizer.validateUUID(vaultId);

    // Use cache to reduce database queries
    return this.contractCache.getVaultState(sanitizedVaultId, async () => {
      const vault = await this.vaultRepository.findOne({
        where: { id: sanitizedVaultId },
        relations: ['deposits', 'owner'],
      });

      if (!vault) {
        throw new NotFoundException('Vault not found');
      }

      return vault;
    });
  }

  async depositToVault(
    vaultId: string,
    depositDto: DepositDto,
  ): Promise<DepositVaultResponseDto> {
    const { userId, amount, idempotencyKey } = depositDto;

    // Check email verification
    const isVerified = await this.authService.isEmailVerified(userId);
    if (!isVerified) {
      throw new ForbiddenException(
        'Email verification is required to make deposits. Please verify your email address.',
      );
    }

    if (idempotencyKey) {
      const existingDeposit = await this.depositRepository.findOne({
        where: { idempotencyKey, userId },
        relations: ['vault'],
      });
      if (existingDeposit) {
        this.logger.log(
          `Duplicate deposit detected with idempotencyKey: ${idempotencyKey}`,
          'VaultsService',
        );
        const userTotalDeposits = await this.getUserTotalDeposits(userId);
        return {
          vault: existingDeposit.vault
            ? this.mapVaultToResponse(existingDeposit.vault)
            : null,
          deposit: this.mapDepositToResponse(existingDeposit),
          userTotalDeposits,
          feeAmount: 0,
          netAmount: Number(existingDeposit.amount),
        };
      }
    }

    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    if (amount > MAX_SAFE_DEPOSIT) {
      throw new BadRequestException(
        'Deposit amount exceeds maximum allowed value',
      );
    }

    const vault = await this.getVaultById(vaultId);

    if (vault.status !== VaultStatus.ACTIVE) {
      throw new BadRequestException('Vault is not active for deposits');
    }

    if (vault.isFullCapacity) {
      throw new BadRequestException('Vault has reached maximum capacity');
    }

    // Verify if the requested deposit amount is within the available capacity of the vault.
    // The available capacity is derived from the formula: availableCapacity = maxCapacity - totalDeposits.
    if (amount > vault.availableCapacity) {
      throw new BadRequestException(
        `Deposit amount exceeds available vault capacity. Available: ${vault.availableCapacity}`,
      );
    }

    const deposit = this.depositRepository.create({
      userId,
      vaultId,
      amount,
      status: DepositStatus.PENDING,
      transactionHash: null,
      stellarTransactionId: null,
      confirmedAt: null,
      idempotencyKey: idempotencyKey || null,
    });

    const entryFee = this.feesService.calculateFee(amount, vault.entryFeeBps ?? 0);

    const result = await this.dataSource.transaction(async (manager) => {
      const savedDeposit = await manager.save(deposit);

      await this.depositEventService.appendEvent(
        {
          depositId: savedDeposit.id,
          userId,
          vaultId,
          eventType: DepositEventType.INITIATED,
          amount,
          idempotencyKey: idempotencyKey || null,
          payload: { status: DepositStatus.PENDING },
        },
        manager,
      );

      // Log fee collection event when an entry fee is charged
      if (entryFee.feeAmount > 0) {
        await this.depositEventService.appendEvent(
          {
            depositId: savedDeposit.id,
            userId,
            vaultId,
            eventType: DepositEventType.FEE_COLLECTED,
            amount: entryFee.feeAmount,
            payload: {
              feeType: 'entry',
              feeBps: entryFee.feeBps,
              grossAmount: entryFee.grossAmount,
              netAmount: entryFee.netAmount,
              feeAddress: vault.feeAddress ?? null,
            },
          },
          manager,
        );
      }

      // Only the net amount (after entry fee) counts toward vault deposits
      await manager.increment(Vault, { id: vaultId }, 'totalDeposits', entryFee.netAmount);

      const updatedVault = await manager.findOne(Vault, {
        where: { id: vaultId },
      });

      if (updatedVault && updatedVault.isFullCapacity) {
        await manager.update(
          Vault,
          { id: vaultId },
          { status: VaultStatus.FULL_CAPACITY },
        );
      }

      return { deposit: savedDeposit, vault: updatedVault };
    });

    if (amount >= LARGE_DEPOSIT_THRESHOLD) {
      await this.notificationsService.create(
        NotificationHelper.largeDepositAlert({
          amount,
          vaultName: vault.vaultName,
        }),
      );
    }

    const confirmedDeposit = await this.confirmDeposit(result.deposit.id);

    const userTotalDeposits = await this.getUserTotalDeposits(userId);

    this.logger.log(
      `Deposit of ${amount} confirmed into vault ${vaultId} by user ${userId}`,
      'VaultsService',
    );

    this.vaultGateway.emitDeposit({
      vaultId,
      vaultName: vault.vaultName,
      asset: vault.type,
      amount,
      userId,
      newBalance: result.vault ? Number(result.vault.totalDeposits) : 0,
    });

    this.eventEmitter.emit(
      DomainEventNames.DEPOSIT_COMPLETED,
      new DepositCompletedEvent(
        confirmedDeposit.id,
        userId,
        vaultId,
        amount,
        vault.vaultName,
        result.vault ? Number(result.vault.totalDeposits) : 0,
      ),
    );

    return {
      vault: result.vault ? this.mapVaultToResponse(result.vault) : null,
      deposit: this.mapDepositToResponse(confirmedDeposit),
      userTotalDeposits,
      feeAmount: entryFee.feeAmount,
      netAmount: entryFee.netAmount,
    };
  }

  async batchDepositToVaults(
    userId: string,
    dto: BatchDepositDto,
  ): Promise<{ results: DepositVaultResponseDto[]; userTotalDeposits: number }> {
    // Check email verification
    const isVerified = await this.authService.isEmailVerified(userId);
    if (!isVerified) {
      throw new ForbiddenException(
        'Email verification is required to make deposits. Please verify your email address.',
      );
    }

    const deposits = dto.deposits ?? [];
    if (deposits.length === 0) {
      throw new BadRequestException('At least one deposit is required');
    }

    // Minimal dedupe check: idempotencyKey duplicates within the same request.
    const keys = deposits
      .map((d) => d.idempotencyKey)
      .filter((k): k is string => typeof k === 'string' && k.length > 0);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      throw new BadRequestException('Duplicate idempotencyKey in batch request');
    }

    const results = await this.dataSource.transaction(async (manager) => {
      // Load and validate all vaults up front.
      const uniqueVaultIds = Array.from(new Set(deposits.map((d) => d.vaultId)));
      const vaults = await manager.find(Vault, {
        where: uniqueVaultIds.map((id) => ({ id })),
      });
      const vaultById = new Map(vaults.map((v) => [v.id, v]));

      for (const vaultId of uniqueVaultIds) {
        if (!vaultById.has(vaultId)) {
          throw new NotFoundException(`Vault not found: ${vaultId}`);
        }
      }

      // Aggregate requested amounts per vault so we can fail-fast on capacity.
      const totalByVault = new Map<string, number>();
      for (const item of deposits) {
        const amount = item.amount;
        if (amount <= 0) {
          throw new BadRequestException('Deposit amount must be greater than 0');
        }
        if (amount > MAX_SAFE_DEPOSIT) {
          throw new BadRequestException(
            'Deposit amount exceeds maximum allowed value',
          );
        }
        totalByVault.set(item.vaultId, (totalByVault.get(item.vaultId) ?? 0) + amount);
      }

      for (const [vaultId, totalAmount] of totalByVault.entries()) {
        const vault = vaultById.get(vaultId)!;
        if (vault.status !== VaultStatus.ACTIVE) {
          throw new BadRequestException(
            `Vault is not active for deposits: ${vaultId}`,
          );
        }
        if (vault.isFullCapacity) {
          throw new BadRequestException(
            `Vault has reached maximum capacity: ${vaultId}`,
          );
        }
        if (totalAmount > vault.availableCapacity) {
          throw new BadRequestException(
            `Batch deposits exceed available vault capacity for ${vaultId}. Available: ${vault.availableCapacity}`,
          );
        }
      }

      // Idempotency: if any requested idempotencyKey already exists, fail the whole batch.
      if (uniqueKeys.size > 0) {
        const existing = await manager.find(Deposit, {
          where: Array.from(uniqueKeys).map((key) => ({ userId, idempotencyKey: key })),
          relations: ['vault'],
        });
        if (existing.length > 0) {
          const first = existing[0];
          throw new BadRequestException(
            `Duplicate deposit detected with idempotencyKey: ${first.idempotencyKey}`,
          );
        }
      }

      const perDepositResponses: DepositVaultResponseDto[] = [];

      // Create + confirm each deposit within the same transaction for atomicity.
      for (const item of deposits) {
        const deposit = manager.getRepository(Deposit).create({
          userId,
          vaultId: item.vaultId,
          amount: item.amount,
          status: DepositStatus.PENDING,
          transactionHash: null,
          stellarTransactionId: null,
          confirmedAt: null,
          idempotencyKey: item.idempotencyKey || null,
        });

        const savedDeposit = await manager.save(deposit);

        await this.depositEventService.appendEvent(
          {
            depositId: savedDeposit.id,
            userId,
            vaultId: item.vaultId,
            eventType: DepositEventType.INITIATED,
            amount: item.amount,
            idempotencyKey: item.idempotencyKey || null,
            payload: { status: DepositStatus.PENDING },
          },
          manager,
        );

        await manager.increment(
          Vault,
          { id: item.vaultId },
          'totalDeposits',
          item.amount,
        );

        const stellarTransactionId: string | null = `mock_stellar_${Date.now()}`;
        const transactionHash = `mock_tx_${Date.now()}`;
        const confirmedAt = new Date();

        await manager.update(Deposit, savedDeposit.id, {
          status: DepositStatus.CONFIRMED,
          confirmedAt,
          transactionHash,
          ...(stellarTransactionId != null ? { stellarTransactionId } : {}),
        });

        await this.depositEventService.appendEvent(
          {
            depositId: savedDeposit.id,
            userId,
            vaultId: item.vaultId,
            eventType: DepositEventType.CONFIRMED,
            amount: item.amount,
            transactionHash,
            stellarTransactionId,
            idempotencyKey: item.idempotencyKey || null,
            payload: {
              status: DepositStatus.CONFIRMED,
              confirmedAt: confirmedAt.toISOString(),
            },
          },
          manager,
        );

        const updatedVault = await manager.findOne(Vault, {
          where: { id: item.vaultId },
        });

        if (updatedVault && updatedVault.isFullCapacity) {
          await manager.update(
            Vault,
            { id: item.vaultId },
            { status: VaultStatus.FULL_CAPACITY },
          );
          updatedVault.status = VaultStatus.FULL_CAPACITY;
        }

        const confirmedDeposit = await manager.findOne(Deposit, {
          where: { id: savedDeposit.id },
        });

        if (!confirmedDeposit) {
          throw new NotFoundException('Deposit not found after confirmation');
        }

        const userTotalDeposits = await manager
          .getRepository(Deposit)
          .createQueryBuilder('deposit')
          .select('SUM(deposit.amount)', 'total')
          .where('deposit.userId = :userId', { userId })
          .andWhere('deposit.status = :status', { status: DepositStatus.CONFIRMED })
          .getRawOne();

        const batchEntryFee = this.feesService.calculateFee(item.amount, vaultById.get(item.vaultId)?.entryFeeBps ?? 0);

        perDepositResponses.push({
          vault: updatedVault ? this.mapVaultToResponse(updatedVault) : null,
          deposit: this.mapDepositToResponse(confirmedDeposit),
          userTotalDeposits: userTotalDeposits?.total
            ? parseFloat(userTotalDeposits.total)
            : 0,
          feeAmount: batchEntryFee.feeAmount,
          netAmount: batchEntryFee.netAmount,
        });
      }

      return perDepositResponses;
    });

    // Post-transaction: recompute total deposits and emit events/notifications asynchronously.
    const userTotalDeposits = await this.getUserTotalDeposits(userId);

    for (const r of results) {
      const amount = r.deposit.amount;
      if (amount >= LARGE_DEPOSIT_THRESHOLD && r.vault) {
        await this.notificationsService.create(
          NotificationHelper.largeDepositAlert({
            amount,
            vaultName: r.vault.vaultName,
          }),
        );
      }

      if (r.vault) {
        this.vaultGateway.emitDeposit({
          vaultId: r.vault.id,
          vaultName: r.vault.vaultName,
          asset: r.vault.type,
          amount,
          userId,
          newBalance: r.vault.totalDeposits,
        });

        this.eventEmitter.emit(
          DomainEventNames.DEPOSIT_COMPLETED,
          new DepositCompletedEvent(
            r.deposit.id,
            userId,
            r.vault.id,
            amount,
            r.vault.vaultName,
            r.vault.totalDeposits,
          ),
        );
      }
    }

    return { results, userTotalDeposits };
  }

  private async confirmDeposit(depositId: string): Promise<Deposit> {
    const deposit = await this.depositRepository.findOne({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    const stellarTransactionId: string | null = `mock_stellar_${Date.now()}`;
    const transactionHash = `mock_tx_${Date.now()}`;
    const confirmedAt = new Date();

    await this.depositRepository.update(depositId, {
      status: DepositStatus.CONFIRMED,
      confirmedAt,
      transactionHash,
      ...(stellarTransactionId != null ? { stellarTransactionId } : {}),
    });

    await this.depositEventService.appendEvent({
      depositId,
      userId: deposit.userId,
      vaultId: deposit.vaultId,
      eventType: DepositEventType.CONFIRMED,
      amount: Number(deposit.amount),
      transactionHash,
      stellarTransactionId,
      idempotencyKey: deposit.idempotencyKey,
      payload: {
        status: DepositStatus.CONFIRMED,
        confirmedAt: confirmedAt.toISOString(),
      },
    });

    const updatedDeposit = await this.depositRepository.findOne({
      where: { id: depositId },
    });

    if (!updatedDeposit) {
      throw new NotFoundException('Deposit not found after confirmation');
    }

    await this.notificationsService.create(
      NotificationHelper.depositConfirmed({
        userId: updatedDeposit.userId,
        amount: updatedDeposit.amount,
        vaultId: updatedDeposit.vaultId,
      }),
    );

    return updatedDeposit;
  }

  async getDepositEventHistory(
    depositId: string,
  ): Promise<DepositEventResponseDto[]> {
    const sanitizedDepositId = this.sanitizer.validateUUID(depositId);
    const events =
      await this.depositEventService.getDepositHistory(sanitizedDepositId);
    return events.map((event) =>
      this.depositEventService.mapEventToResponse(event),
    );
  }

  async getUserDepositEventHistory(
    userId: string,
    vaultId?: string,
  ): Promise<DepositEventResponseDto[]> {
    const sanitizedVaultId = vaultId
      ? this.sanitizer.validateUUID(vaultId)
      : undefined;
    const events = await this.depositEventService.getUserDepositHistory(
      userId,
      sanitizedVaultId,
    );
    return events.map((event) =>
      this.depositEventService.mapEventToResponse(event),
    );
  }

  async getVaultDepositEventHistory(
    vaultId: string,
  ): Promise<DepositEventResponseDto[]> {
    const sanitizedVaultId = this.sanitizer.validateUUID(vaultId);
    const events =
      await this.depositEventService.getVaultDepositHistory(sanitizedVaultId);
    return events.map((event) =>
      this.depositEventService.mapEventToResponse(event),
    );
  }

  async getUserTotalDeposits(userId: string): Promise<number> {
    const result = await this.depositRepository
      .createQueryBuilder('deposit')
      .select('SUM(deposit.amount)', 'total')
      .where('deposit.userId = :userId', { userId })
      .andWhere('deposit.status = :status', { status: DepositStatus.CONFIRMED })
      .getRawOne();

    return result?.total ? parseFloat(result.total) : 0;
  }

  async getUserVaults(userId: string): Promise<VaultResponseDto[]> {
    const vaults = await this.vaultRepository.find({
      where: { ownerId: userId },
      relations: ['deposits'],
      order: { createdAt: 'DESC' },
    });

    return vaults.map((vault) => this.mapVaultToResponse(vault));
  }

  async getPublicVaults(): Promise<VaultResponseDto[]> {
    const vaults = await this.vaultRepository.find({
      where: { isPublic: true },
      relations: ['deposits'],
      order: { createdAt: 'DESC' },
    });

    return vaults.map((vault) => this.mapVaultToResponse(vault));
  }

  async getVaultsMetadata(): Promise<any[]> {
    const vaults = await this.vaultRepository.find({
      select: ['vaultName', 'symbol', 'assetPair'],
      where: { isPublic: true },
    });

    return vaults.map((v) => ({
      name: v.vaultName,
      symbol: v.symbol,
      assetPair: v.assetPair,
    }));
  }

  mapVaultToResponse(vault: Vault): VaultResponseDto {
    const apr = Number(vault.interestRate);
    const compoundingFrequency = this.getVaultCompoundingFrequency(vault);
    const apy = this.calculateApy(apr, compoundingFrequency);

    return {
      id: vault.id,
      ownerId: vault.ownerId,
      type: vault.type,
      status: vault.status,
      vaultName: vault.vaultName,
      description: vault.description,
      symbol: vault.symbol,
      assetPair: vault.assetPair,
      totalDeposits: Number(vault.totalDeposits),
      maxCapacity: Number(vault.maxCapacity),
      availableCapacity: vault.availableCapacity,
      utilizationPercentage: vault.utilizationPercentage,
        interestRate: apr,
      apr,
      apy,
      compoundingFrequency,
      maturityDate: vault.maturityDate,
      lockPeriodEnd: vault.lockPeriodEnd,
      isPublic: vault.isPublic,
      requiresMultiSignature: vault.requiresMultiSignature,
      approvalThreshold: vault.approvalThreshold,
      currentApprovals: vault.currentApprovals,
      approvalStatus: vault.approvalStatus,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
      entryFeeBps: vault.entryFeeBps ?? 0,
      exitFeeBps: vault.exitFeeBps ?? 0,
      performanceFeeBps: vault.performanceFeeBps ?? 0,
      feeAddress: vault.feeAddress ?? null,
    };
  }

  async recordApySnapshot(vaultId: string): Promise<void> {
    const vault = await this.vaultRepository.findOne({
      where: { id: vaultId },
      relations: ['strategy'],
    });

    if (!vault) {
      return;
    }

    const apr = Number(vault.interestRate);
    const apy = this.calculateApy(apr, this.getVaultCompoundingFrequency(vault));
    const today = new Date();
    const snapshotDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('vault_apy_history')
      .values({
        vault_id: vault.id,
        apr,
        apy,
        snapshot_date: snapshotDate,
      })
      .orIgnore()
      .execute();
  }

  async withdrawFromVault(
    vaultId: string,
    userId: string,
    amount: number,
  ): Promise<{ withdrawal: Withdrawal; vault: VaultResponseDto; feeAmount: number; netAmount: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than 0');
    }

    const vault = await this.getVaultById(vaultId);

    if (vault.status === VaultStatus.FROZEN) {
      throw new BadRequestException(
        'Vault is frozen. Withdrawals are blocked.',
      );
    }

    const userTotalDeposits = await this.getUserTotalDeposits(userId);
    if (amount > userTotalDeposits) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    // Check if vault has sufficient liquidity for immediate withdrawal
    if (Number(vault.totalDeposits) >= amount) {
      const exitFee = this.feesService.calculateFee(amount, vault.exitFeeBps ?? 0);

      // Process withdrawal immediately
      const withdrawal = this.withdrawalRepository.create({
        userId,
        vaultId,
        amount,
        status: WithdrawalStatus.PENDING,
      });

    const result = await this.dataSource.transaction(async (manager) => {
      const savedWithdrawal = await manager.save(withdrawal);

        // Log exit fee collection in the deposit_events audit log
        if (exitFee.feeAmount > 0) {
          // We reuse the deposit event log for fee audit entries (vault-scoped)
          await manager.getRepository(DepositEvent).save(
            manager.getRepository(DepositEvent).create({
              depositId: savedWithdrawal.id,
              userId,
              vaultId,
              eventType: DepositEventType.FEE_COLLECTED,
              amount: exitFee.feeAmount,
              payload: {
                feeType: 'exit',
                feeBps: exitFee.feeBps,
                grossAmount: exitFee.grossAmount,
                netAmount: exitFee.netAmount,
                feeAddress: vault.feeAddress ?? null,
              },
            }),
          );
        }

        await manager.decrement(Vault, { id: vaultId }, 'totalDeposits', amount);

      const updatedVault = await manager.findOne(Vault, {
        where: { id: vaultId },
      });

      if (updatedVault && updatedVault.status === VaultStatus.FULL_CAPACITY) {
        await manager.update(
          Vault,
          { id: vaultId },
          { status: VaultStatus.ACTIVE },
        );
        updatedVault.status = VaultStatus.ACTIVE;
      }

      return { withdrawal: savedWithdrawal, vault: updatedVault };
    });

    await this.withdrawalRepository.update(result.withdrawal.id, {
      status: WithdrawalStatus.CONFIRMED,
      confirmedAt: new Date(),
      transactionHash: `mock_withdraw_tx_${Date.now()}`,
    });

    const confirmedWithdrawal = await this.withdrawalRepository.findOne({
      where: { id: result.withdrawal.id },
    });

    if (!confirmedWithdrawal) {
      throw new NotFoundException('Withdrawal not found after confirmation');
    }

    // Emit an async event for post-confirmation work (notifications, realtime, downstream domain events).
    this.eventEmitter.emit(
      DomainEventNames.WITHDRAWAL_CONFIRMED,
      new WithdrawalConfirmedEvent(
        confirmedWithdrawal.id,
        userId,
        title: 'Withdrawal Confirmed',
        message: `Your withdrawal of ${amount} from vault ${vault.vaultName} has been confirmed.`,
        type: NotificationType.WITHDRAWAL,
      });

      return {
        withdrawal: result.withdrawal,
        vault: result.vault
          ? this.mapVaultToResponse(result.vault)
          : this.mapVaultToResponse(vault),
        feeAmount: exitFee.feeAmount,
        netAmount: exitFee.netAmount,
      };
    }

    // Insufficient liquidity: queue the withdrawal for later processing
    const queuedWithdrawal = this.withdrawalRepository.create({
      userId,
      vaultId,
      amount,
      status: WithdrawalStatus.PENDING,
    });

    const savedQueuedWithdrawal = await this.withdrawalRepository.save(queuedWithdrawal);
    await this.withdrawalQueueService.enqueueWithdrawal(savedQueuedWithdrawal.id);

    const queuedWithdrawalResult = await this.withdrawalRepository.findOne({
      where: { id: savedQueuedWithdrawal.id },
    });

    if (!queuedWithdrawalResult) {
      throw new NotFoundException('Withdrawal not found after queuing');
    }

    return {
      withdrawal: queuedWithdrawalResult,
      vault: this.mapVaultToResponse(vault),
      feeAmount: 0,
      netAmount: amount,
    };
  }

  private mapDepositToResponse(deposit: Deposit): DepositResponseDto {
    return {
      id: deposit.id,
      userId: deposit.userId,
      vaultId: deposit.vaultId,
      status: deposit.status,
      amount: Number(deposit.amount),
      transactionHash: deposit.transactionHash,
      createdAt: deposit.createdAt,
      confirmedAt: deposit.confirmedAt,
    };
  }

  async getApyHistory(
    vaultId?: string,
    timeRange: string = '30d',
  ): Promise<any[]> {
    const now = new Date();
    let daysBack = 30;

    switch (timeRange) {
      case '7d':
        daysBack = 7;
        break;
      case '90d':
        daysBack = 90;
        break;
      case 'all':
        daysBack = 365; // Approximate 1 year
        break;
      default:
        daysBack = 30;
    }

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const query = this.apyHistoryRepository
      .createQueryBuilder('history')
      .where('history.snapshotDate >= :startDate', {
        startDate: startDate.toISOString().split('T')[0],
      })
      .orderBy('history.snapshotDate', 'ASC');

    if (vaultId) {
      query.andWhere('history.vaultId = :vaultId', { vaultId });
    }

    const rows = await query.getMany();

    if (rows.length === 0) {
      // Fallback: If no real data exists, generate some mock data so charts aren't blank
      const dataPoints: { date: string; apy: number; vaultId: string }[] = [];
      for (let i = 0; i < daysBack; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const baseApy = 8 + Math.sin(i / 10) * 2 + Math.random() * 1;
        const apy = Math.max(0, Math.min(15, baseApy));

        dataPoints.push({
          date: date.toISOString().split('T')[0],
          apy: Math.round(apy * 100) / 100,
          vaultId: vaultId || 'all',
        });
      }

      return dataPoints;
    }

    return rows.map((row) => ({
      date: row.snapshotDate.toISOString().split('T')[0],
      apy: Number(row.apy),
      vaultId: row.vaultId,
    }));
  }

  async updateVaultMultiSignatureConfig(
    vaultId: string,
    userId: string,
    requiresMultiSignature: boolean,
    approvalThreshold: number,
  ): Promise<VaultResponseDto> {
    const vault = await this.getVaultById(vaultId);

    // Only vault owner or admin can update multi-signature config
    if (vault.ownerId !== userId && !this.isCurrentUserAdmin(userId)) {
      throw new UnauthorizedException('Only vault owner or admin can update multi-signature configuration');
    }

    // Validate threshold
    if (approvalThreshold < 1 || approvalThreshold > 10) {
      throw new BadRequestException('Approval threshold must be between 1 and 10');
    }

    await this.vaultRepository.update(vaultId, {
      requiresMultiSignature,
      approvalThreshold,
      currentApprovals: requiresMultiSignature ? 0 : 0,
    });

    const updatedVault = await this.getVaultById(vaultId);
    return this.mapVaultToResponse(updatedVault);
  }

  async updateVaultFees(vaultId: string, userId: string, dto: UpdateVaultFeesDto): Promise<VaultResponseDto> {
    const vault = await this.getVaultById(vaultId);

    if (vault.ownerId !== userId) {
      throw new UnauthorizedException('Only the vault owner can configure fees');
    }

    this.feesService.validateFees(dto.entryFeeBps, dto.exitFeeBps, dto.performanceFeeBps);

    await this.vaultRepository.update(vaultId, {
      entryFeeBps: dto.entryFeeBps,
      exitFeeBps: dto.exitFeeBps,
      performanceFeeBps: dto.performanceFeeBps,
      feeAddress: dto.feeAddress ?? vault.feeAddress,
    });

    const updated = await this.getVaultById(vaultId);
    return this.mapVaultToResponse(updated);
  }

  async requestVaultApproval(
    vaultId: string,
    userId: string,
    approverUserId: string,
  ): Promise<void> {
    const vault = await this.getVaultById(vaultId);

    // Only vault owner or admin can request approvals
    if (vault.ownerId !== userId && !this.isCurrentUserAdmin(userId)) {
      throw new UnauthorizedException('Only vault owner or admin can request approvals');
    }

    // Check if approver exists
    const approver = await this.dataSource.getRepository(User).findOne({
      where: { id: approverUserId },
    });
    if (!approver) {
      throw new BadRequestException('Approver user not found');
    }

    // Check if approval already exists
    const existingApproval = await this.dataSource.getRepository(VaultApproval).findOne({
      where: { vaultId, userId: approverUserId },
    });
    if (existingApproval) {
      throw new BadRequestException('Approval request already exists for this user');
    }

    // Create new approval request
    await this.dataSource.getRepository(VaultApproval).save({
      vaultId,
      userId: approverUserId,
      status: 'PENDING',
      comment: null,
    });

    // Notify approver
    await this.notificationsService.create({
      userId: approverUserId,
      title: 'Vault Approval Request',
      message: `You have been requested to approve operations for vault ${vault.vaultName}.`,
      type: NotificationType.APPROVAL,
      adminOnly: false,
    });
  }

  async approveVaultOperation(
    vaultId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const vault = await this.getVaultById(vaultId);

    // Only approved approvers can approve
    const approval = await this.dataSource.getRepository(VaultApproval).findOne({
      where: { vaultId, userId },
      relations: ['vault'],
    });

    if (!approval) {
      throw new BadRequestException('No pending approval request found for this user');
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Approval request is not in PENDING state');
    }

    // Update approval status
    await this.dataSource.getRepository(VaultApproval).update(approval.id, {
      status: 'APPROVED',
    });

    // Update vault's current approvals count
    const vaultRepo = this.dataSource.getRepository(Vault);
    const vaultEntity = await vaultRepo.findOne({ where: { id: vaultId } });
    if (!vaultEntity) {
      throw new NotFoundException('Vault not found');
    }

    const currentApprovals = vaultEntity.currentApprovals + 1;
    await vaultRepo.update(vaultId, {
      currentApprovals,
    });

    // Check if threshold is met
    if (currentApprovals >= vaultEntity.approvalThreshold) {
      // All required approvals are met
      await this.notificationsService.create({
        userId: vault.ownerId,
        title: 'Vault Approvals Complete',
        message: `All required approvals have been received for vault ${vault.vaultName}.`,
        type: NotificationType.APPROVAL,
        adminOnly: false,
      });
    }

    return {
      success: true,
      message: 'Vault operation approved successfully',
    };
  }

  async pauseVault(vaultId: string, userId: string): Promise<VaultResponseDto> {
    const vault = await this.getVaultById(vaultId);

    // Only vault owner or admin can pause vault
    if (vault.ownerId !== userId && !this.isCurrentUserAdmin(userId)) {
      throw new UnauthorizedException('Only vault owner or admin can pause vault');
    }

    // Check if vault is already paused
    if (vault.status === VaultStatus.FROZEN) {
      throw new BadRequestException('Vault is already paused');
    }

    // Update vault status to FROZEN
    await this.vaultRepository.update(vaultId, {
      status: VaultStatus.FROZEN,
    });

    const updatedVault = await this.getVaultById(vaultId);
    return this.mapVaultToResponse(updatedVault);
  }

  async resumeVault(vaultId: string, userId: string): Promise<VaultResponseDto> {
    const vault = await this.getVaultById(vaultId);

    // Only vault owner or admin can resume vault
    if (vault.ownerId !== userId && !this.isCurrentUserAdmin(userId)) {
      throw new UnauthorizedException('Only vault owner or admin can resume vault');
    }

    // Check if vault is paused
    if (vault.status !== VaultStatus.FROZEN) {
      throw new BadRequestException('Vault is not paused');
    }

    // Update vault status back to ACTIVE
    await this.vaultRepository.update(vaultId, {
      status: VaultStatus.ACTIVE,
    });

    const updatedVault = await this.getVaultById(vaultId);
    return this.mapVaultToResponse(updatedVault);
  }

  private async isCurrentUserAdmin(userId: string): Promise<boolean> {
    // In production, this would check the user's role in the database
    // For now, we'll implement a simple check
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: ['role'],
    });
    return user?.role === 'ADMIN';
  }
}
