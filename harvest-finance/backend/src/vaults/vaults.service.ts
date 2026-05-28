import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vault, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../database/entities/withdrawal.entity';
import { DepositDto } from './dto/deposit.dto';
import {
  DepositVaultResponseDto,
  VaultResponseDto,
  DepositResponseDto,
} from './dto/vault-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { VaultGateway } from '../realtime/vault.gateway';
import { ContractCacheService } from '../common/cache/contract-cache.service';
import { InputSanitizerService } from '../common/sanitization/input-sanitizer.service';

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
      await this.notificationsService.create({
        title: 'Large Deposit Alert',
        message: `A large deposit of ${amount} has been initiated for vault ${vault.vaultName}.`,
        type: NotificationType.LARGE_TRANSACTION,
        adminOnly: true,
      });
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

    return {
      vault: result.vault ? this.mapVaultToResponse(result.vault) : null,
      deposit: this.mapDepositToResponse(confirmedDeposit),
      userTotalDeposits,
    };
  }

  private async confirmDeposit(depositId: string): Promise<Deposit> {
    const deposit = await this.depositRepository.findOne({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    await this.depositRepository.update(depositId, {
      status: DepositStatus.CONFIRMED,
      confirmedAt: new Date(),
      transactionHash: `mock_tx_${Date.now()}`,
      stellarTransactionId: `mock_stellar_${Date.now()}`,
    });

    const updatedDeposit = await this.depositRepository.findOne({
      where: { id: depositId },
    });

    if (!updatedDeposit) {
      throw new NotFoundException('Deposit not found after confirmation');
    }

    await this.notificationsService.create({
      userId: updatedDeposit.userId,
      title: 'Deposit Confirmed',
      message: `Your deposit of ${updatedDeposit.amount} into vault ${updatedDeposit.vaultId} has been confirmed.`,
      type: NotificationType.DEPOSIT,
    });

    return updatedDeposit;
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

    await this.notificationsService.create({
      userId,
      title: 'Withdrawal Confirmed',
      message: `Your withdrawal of ${amount} from vault ${vault.vaultName} has been confirmed.`,
      type: NotificationType.DEPOSIT,
    });

    this.logger.log(
      `Withdrawal of ${amount} confirmed from vault ${vaultId} by user ${userId}`,
      'VaultsService',
    );

    this.vaultGateway.emitWithdrawal({
      vaultId,
      vaultName: vault.vaultName,
      asset: vault.type,
      amount,
      userId,
      newBalance: result.vault ? Number(result.vault.totalDeposits) : 0,
    });

    return {
      withdrawal: confirmedWithdrawal,
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
}
