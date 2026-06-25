import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere, LessThan } from 'typeorm';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { DepositEventType } from '../database/entities/deposit-event.entity';
import { ExternalPaymentEventType } from './dto/external-payment-notification.dto';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { DepositDto } from './dto/deposit.dto';
import { BatchDepositDto } from './dto/batch-deposit.dto';
import {
  DepositVaultResponseDto,
  VaultResponseDto,
  DepositResponseDto,
  PaginatedVaultsResponseDto,
} from './dto/vault-response.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationHelper } from '../notifications/notification.helper';
import { NotificationType } from '../database/entities/notification.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';
import { VaultApproval } from '../database/entities/vault-approval.entity';
import { User } from '../database/entities/user.entity';
import { DepositEventService } from './deposit-event.service';
import { DepositEventResponseDto } from './dto/deposit-event-response.dto';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  DepositCompletedEvent,
  DomainEventNames,
  WithdrawalConfirmedEvent,
  WithdrawalCompletedEvent,
  PaymentReceivedEvent,
} from '../domain-events';

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
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private logger: CustomLoggerService,
    private vaultGateway: VaultGateway,
    private contractCache: ContractCacheService,
    private sanitizer: InputSanitizerService,
    private depositEventService: DepositEventService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

      await manager.increment(Vault, { id: vaultId }, 'totalDeposits', amount);

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

    const userTotalDeposits = await this.getUserTotalDeposits(userId);

    this.logger.log(
      `Deposit of ${amount} initiated for vault ${vaultId} by user ${userId}`,
      'VaultsService',
    );

    return {
      vault: result.vault ? this.mapVaultToResponse(result.vault) : null,
      deposit: this.mapDepositToResponse(result.deposit),
      userTotalDeposits,
    };
  }

  async batchDepositToVaults(
    userId: string,
    dto: BatchDepositDto,
  ): Promise<{ results: DepositVaultResponseDto[]; userTotalDeposits: number }> {
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

        perDepositResponses.push({
          vault: updatedVault ? this.mapVaultToResponse(updatedVault) : null,
          deposit: this.mapDepositToResponse(confirmedDeposit),
          userTotalDeposits: userTotalDeposits?.total
            ? parseFloat(userTotalDeposits.total)
            : 0,
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
    const { deposit } = await this.applyExternalPaymentNotification({
      depositId,
      eventType: ExternalPaymentEventType.PAYMENT_CONFIRMED,
      transactionHash: `mock_tx_${Date.now()}`,
      stellarTransactionId: `mock_stellar_${Date.now()}`,
      externalEventId: `internal_confirm_${depositId}`,
    });
    return deposit;
  }

  /**
   * Applies payment status updates from external webhook providers.
   */
  async applyExternalPaymentNotification(params: {
    depositId: string;
    eventType: ExternalPaymentEventType;
    transactionHash: string;
    stellarTransactionId?: string | null;
    externalEventId: string;
    occurredAt?: Date;
  }): Promise<{
    deposit: Deposit;
    status: DepositStatus;
    duplicate: boolean;
  }> {
    const depositId = this.sanitizer.validateUUID(params.depositId);
    const deposit = await this.depositRepository.findOne({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (params.eventType === ExternalPaymentEventType.PAYMENT_CONFIRMED) {
      if (deposit.status === DepositStatus.CONFIRMED) {
        return {
          deposit,
          status: deposit.status,
          duplicate: true,
        };
      }

      const confirmedAt = params.occurredAt ?? new Date();
      const stellarTransactionId = params.stellarTransactionId ?? null;

      await this.depositRepository.update(depositId, {
        status: DepositStatus.CONFIRMED,
        confirmedAt,
        transactionHash: params.transactionHash,
        ...(stellarTransactionId != null ? { stellarTransactionId } : {}),
      });

      await this.depositEventService.appendEvent({
        depositId,
        userId: deposit.userId,
        vaultId: deposit.vaultId,
        eventType: DepositEventType.CONFIRMED,
        amount: Number(deposit.amount),
        transactionHash: params.transactionHash,
        stellarTransactionId,
        idempotencyKey: deposit.idempotencyKey,
        payload: {
          status: DepositStatus.CONFIRMED,
          confirmedAt: confirmedAt.toISOString(),
          externalEventId: params.externalEventId,
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

      return {
        deposit: updatedDeposit,
        status: DepositStatus.CONFIRMED,
        duplicate: false,
      };
    }

    if (deposit.status === DepositStatus.FAILED) {
      return {
        deposit,
        status: deposit.status,
        duplicate: true,
      };
    }

    await this.depositRepository.update(depositId, {
      status: DepositStatus.FAILED,
      transactionHash: params.transactionHash,
      ...(params.stellarTransactionId != null
        ? { stellarTransactionId: params.stellarTransactionId }
        : {}),
    });

    await this.depositEventService.appendEvent({
      depositId,
      userId: deposit.userId,
      vaultId: deposit.vaultId,
      eventType: DepositEventType.FAILED,
      amount: Number(deposit.amount),
      transactionHash: params.transactionHash,
      stellarTransactionId: params.stellarTransactionId ?? null,
      idempotencyKey: deposit.idempotencyKey,
      payload: {
        status: DepositStatus.FAILED,
        externalEventId: params.externalEventId,
      },
    });

    const failedDeposit = await this.depositRepository.findOne({
      where: { id: depositId },
    });

    if (!failedDeposit) {
      throw new NotFoundException('Deposit not found after failure update');
    }

    return {
      deposit: failedDeposit,
      status: DepositStatus.FAILED,
      duplicate: false,
    };
  }

  /**
   * Applies payment status updates for withdrawals from external webhook providers.
   */
  async applyExternalWithdrawalNotification(params: {
    withdrawalId: string;
    eventType: ExternalPaymentEventType;
    transactionHash: string;
    stellarTransactionId?: string | null;
    externalEventId: string;
    occurredAt?: Date;
  }): Promise<{
    withdrawal: Withdrawal;
    status: WithdrawalStatus;
    duplicate: boolean;
  }> {
    const withdrawalId = this.sanitizer.validateUUID(params.withdrawalId);
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['vault'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (params.eventType === ExternalPaymentEventType.PAYMENT_CONFIRMED) {
      if (withdrawal.status === WithdrawalStatus.CONFIRMED) {
        return {
          withdrawal,
          status: withdrawal.status,
          duplicate: true,
        };
      }

      const confirmedAt = params.occurredAt ?? new Date();

      await this.withdrawalRepository.update(withdrawalId, {
        status: WithdrawalStatus.CONFIRMED,
        confirmedAt,
        transactionHash: params.transactionHash,
      });

      const updatedWithdrawal = await this.withdrawalRepository.findOne({
        where: { id: withdrawalId },
        relations: ['vault'],
      });

      if (!updatedWithdrawal) {
        throw new NotFoundException('Withdrawal not found after confirmation');
      }

      // Emit an async event for post-confirmation work (notifications, realtime, downstream domain events).
      this.eventEmitter.emit(
        DomainEventNames.WITHDRAWAL_CONFIRMED,
        new WithdrawalConfirmedEvent(
          updatedWithdrawal.id,
          updatedWithdrawal.userId,
          updatedWithdrawal.vaultId,
          Number(updatedWithdrawal.amount),
          updatedWithdrawal.vault.vaultName,
          Number(updatedWithdrawal.vault.totalDeposits),
          updatedWithdrawal.transactionHash,
          updatedWithdrawal.confirmedAt ?? new Date(),
        ),
      );

      return {
        withdrawal: updatedWithdrawal,
        status: WithdrawalStatus.CONFIRMED,
        duplicate: false,
      };
    }

    if (withdrawal.status === WithdrawalStatus.FAILED) {
      return {
        withdrawal,
        status: withdrawal.status,
        duplicate: true,
      };
    }

    await this.withdrawalRepository.update(withdrawalId, {
      status: WithdrawalStatus.FAILED,
      transactionHash: params.transactionHash,
    });

    const failedWithdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['vault'],
    });

    return {
      withdrawal: failedWithdrawal!,
      status: WithdrawalStatus.FAILED,
      duplicate: false,
    };
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

  /**
   * Creates a new vault by deep-copying configuration from an existing vault.
   * Financial state (deposits, approvals, balances) is reset on the clone.
   */
  async cloneVaultFromTemplate(
    sourceVaultId: string,
    userId: string,
    vaultName?: string,
  ): Promise<VaultResponseDto> {
    const sanitizedSourceId = this.sanitizer.validateUUID(sourceVaultId);
    const sourceVault = await this.vaultRepository.findOne({
      where: { id: sanitizedSourceId },
    });

    if (!sourceVault) {
      throw new NotFoundException('Vault not found');
    }

    if (sourceVault.ownerId !== userId) {
      throw new UnauthorizedException(
        'Only the vault owner can clone this vault',
      );
    }

    const resolvedName = (vaultName?.trim() ||
      `${sourceVault.vaultName} (Copy)`).slice(0, 100);

    if (!resolvedName) {
      throw new BadRequestException('Vault name is required');
    }

    const clonedVault = this.vaultRepository.create({
      ownerId: userId,
      type: sourceVault.type,
      status: VaultStatus.ACTIVE,
      vaultName: resolvedName,
      description: sourceVault.description,
      symbol: sourceVault.symbol,
      assetPair: sourceVault.assetPair,
      totalDeposits: 0,
      maxCapacity: sourceVault.maxCapacity,
      interestRate: sourceVault.interestRate,
      maturityDate: sourceVault.maturityDate,
      lockPeriodEnd: sourceVault.lockPeriodEnd,
      isPublic: sourceVault.isPublic,
      requiresMultiSignature: sourceVault.requiresMultiSignature,
      approvalThreshold: sourceVault.approvalThreshold,
      currentApprovals: 0,
    });

    const saved = await this.vaultRepository.save(clonedVault);
    return this.mapVaultToResponse(saved);
  }

  async getPublicVaults(
    query: PaginationQueryDto,
  ): Promise<PaginatedVaultsResponseDto> {
    const limit = query.limit ?? 20;
    const skip = query.skip ?? 0;

    const where: FindOptionsWhere<Vault> = { isPublic: true };
    if (query.cursor) {
      where.createdAt = LessThan(new Date(query.cursor));
    }

    const [vaults, total] = await Promise.all([
      this.vaultRepository.find({
        where,
        relations: ['deposits'],
        order: { createdAt: 'DESC' },
        skip: query.cursor ? 0 : skip,
        take: limit + 1,
      }),
      this.vaultRepository.count({ where: { isPublic: true } }),
    ]);

    const hasMore = vaults.length > limit;
    if (hasMore) {
      vaults.pop();
    }

    return {
      data: vaults.map((vault) => this.mapVaultToResponse(vault)),
      total,
      hasMore,
    };
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
      interestRate: Number(vault.interestRate),
      maturityDate: vault.maturityDate,
      lockPeriodEnd: vault.lockPeriodEnd,
      isPublic: vault.isPublic,
      requiresMultiSignature: vault.requiresMultiSignature,
      approvalThreshold: vault.approvalThreshold,
      currentApprovals: vault.currentApprovals,
      approvalStatus: vault.approvalStatus,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    };
  }

  async withdrawFromVault(
    vaultId: string,
    userId: string,
    amount: number,
  ): Promise<{ withdrawal: Withdrawal; vault: VaultResponseDto }> {
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

    const withdrawal = this.withdrawalRepository.create({
      userId,
      vaultId,
      amount,
      status: WithdrawalStatus.PENDING,
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const savedWithdrawal = await manager.save(withdrawal);

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

    return {
      withdrawal: result.withdrawal,
      vault: result.vault
        ? this.mapVaultToResponse(result.vault)
        : this.mapVaultToResponse(vault),
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
    // Calculate date range
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

    // For now, generate mock APY data
    // In production, this would come from yield analytics data stored in database
    const dataPoints: { date: string; apy: number; vaultId: string }[] = [];
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      // Generate somewhat realistic APY data with some variation
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

  async updateVaultMultiSignatureConfig(
    vaultId: string,
    userId: string,
    requiresMultiSignature: boolean,
    approvalThreshold: number,
  ): Promise<VaultResponseDto> {
    const vault = await this.getVaultById(vaultId);

    // Only vault owner or admin can update multi-signature config
    if (vault.ownerId !== userId && !(await this.isCurrentUserAdmin(userId))) {
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

  async requestVaultApproval(
    vaultId: string,
    userId: string,
    approverUserId: string,
  ): Promise<void> {
    const vault = await this.getVaultById(vaultId);

    // Only vault owner or admin can request approvals
    if (vault.ownerId !== userId && !(await this.isCurrentUserAdmin(userId))) {
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
    if (vault.ownerId !== userId && !(await this.isCurrentUserAdmin(userId))) {
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
    if (vault.ownerId !== userId && !(await this.isCurrentUserAdmin(userId))) {
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

  @OnEvent(DomainEventNames.PAYMENT_RECEIVED, { async: true })
  async handlePaymentReceived(event: PaymentReceivedEvent): Promise<void> {
    this.logger.log(
      `Received payment event: tx=${event.transactionHash} from=${event.from} amount=${event.amount} memo=${event.memo}`,
      'VaultsService',
    );

    // Try to match the payment to a pending deposit
    let deposit: Deposit | null = null;

    // 1. Try matching by memo as deposit ID if it's a valid UUID
    if (event.memo && this.isValidUuid(event.memo)) {
      deposit = await this.depositRepository.findOne({
        where: { id: event.memo, status: DepositStatus.PENDING },
        relations: ['vault'],
      });
    }

    // 2. Try matching by user's stellar address and amount
    if (!deposit) {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { stellarAddress: event.from },
      });

      if (user) {
        deposit = await this.depositRepository.findOne({
          where: {
            userId: user.id,
            amount: event.amount,
            status: DepositStatus.PENDING,
          },
          relations: ['vault'],
          order: { createdAt: 'ASC' },
        });
      }
    }

    if (!deposit) {
      this.logger.warn(
        `Could not match incoming payment to any pending deposit: tx=${event.transactionHash}`,
        'VaultsService',
      );
      return;
    }

    this.logger.log(
      `Matching payment found for deposit ${deposit.id}. Confirming...`,
      'VaultsService',
    );

    // Confirm the deposit using applyExternalPaymentNotification
    const { deposit: confirmedDeposit } = await this.applyExternalPaymentNotification({
      depositId: deposit.id,
      eventType: ExternalPaymentEventType.PAYMENT_CONFIRMED,
      transactionHash: event.transactionHash,
      stellarTransactionId: event.transactionHash,
      externalEventId: `stellar_stream_${event.transactionHash}`,
      occurredAt: event.occurredAt,
    });

    // Retrieve updated vault state
    const vault = await this.vaultRepository.findOne({
      where: { id: deposit.vaultId },
    });

    // Notify client/realtime Gateway
    this.vaultGateway.emitDeposit({
      vaultId: deposit.vaultId,
      vaultName: vault ? vault.vaultName : 'Vault',
      asset: vault ? vault.type : 'Asset',
      amount: Number(deposit.amount),
      userId: deposit.userId,
      newBalance: vault ? Number(vault.totalDeposits) : 0,
    });

    // Emit DepositCompletedEvent
    this.eventEmitter.emit(
      DomainEventNames.DEPOSIT_COMPLETED,
      new DepositCompletedEvent(
        confirmedDeposit.id,
        deposit.userId,
        deposit.vaultId,
        Number(deposit.amount),
        vault ? vault.vaultName : 'Vault',
        vault ? Number(vault.totalDeposits) : 0,
      ),
    );
  }

  private isValidUuid(val: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  }
}
