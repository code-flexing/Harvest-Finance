import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, In } from 'typeorm';
import { Vault, VaultType, VaultStatus } from '../database/entities/vault.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { InsuranceClaim, InsuranceClaimStatus } from '../database/entities/insurance-claim.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

export interface SorobanMultisigEscrow {
  address: string;
  signers: string[];
  threshold: number;
  createdAt: Date;
}

export interface InsuranceFundStats {
  fundBalance: number;
  totalTVL: number;
  coverageRatio: number;
  totalClaimsProcessed: number;
  totalPayoutsDistributed: number;
}

@Injectable()
export class InsuranceFundService {
  private readonly INSURANCE_FUND_VAULT_NAME = 'Insurance Fund';
  private readonly ESCROW_SIGNERS = ['governance-signer-1', 'governance-signer-2', 'governance-signer-3'];
  private readonly ESCROW_THRESHOLD = 2;

  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepo: Repository<Vault>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    @InjectRepository(InsuranceClaim)
    private readonly claimRepo: Repository<InsuranceClaim>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly logger: CustomLoggerService,
  ) {}

  private getEscrowAccount(): SorobanMultisigEscrow {
    return {
      address: 'insurance-multisig-escrow',
      signers: this.ESCROW_SIGNERS,
      threshold: this.ESCROW_THRESHOLD,
      createdAt: new Date(),
    };
  }

  async getOrCreateInsuranceVault(): Promise<Vault> {
    let vault = await this.vaultRepo.findOne({
      where: { type: VaultType.INSURANCE_FUND },
    });
    if (!vault) {
      const escrow = this.getEscrowAccount();
      vault = this.vaultRepo.create({
        ownerId: escrow.address,
        type: VaultType.INSURANCE_FUND,
        status: VaultStatus.ACTIVE,
        vaultName: this.INSURANCE_FUND_VAULT_NAME,
        description: 'Dedicated insurance fund for protecting depositors against protocol incidents and strategy failures.',
        symbol: 'INS',
        assetPair: 'XLM/USDC',
        totalDeposits: 0,
        maxCapacity: Number.MAX_SAFE_INTEGER,
        interestRate: 0,
        isPublic: false,
      });
      await this.vaultRepo.save(vault);
      this.logger.log('Created insurance fund vault with Soroban multisig escrow', 'InsuranceFundService');
    }
    return vault;
  }

  async depositToFund(userId: string, amount: number): Promise<Vault> {
    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    const fundVault = await this.getOrCreateInsuranceVault();

    const deposit = this.depositRepo.create({
      userId,
      vaultId: fundVault.id,
      amount,
      status: DepositStatus.CONFIRMED,
      transactionHash: `ins_fund_tx_${Date.now()}`,
      stellarTransactionId: `stellar_ins_fund_${Date.now()}`,
      confirmedAt: new Date(),
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(deposit);
      await manager.increment(Vault, { id: fundVault.id }, 'totalDeposits', amount);
    });

    this.logger.log(`User ${userId} deposited ${amount} to insurance fund`, 'InsuranceFundService');

    return this.vaultRepo.findOneOrFail({ where: { id: fundVault.id } });
  }

  async getCoverageRatio(): Promise<number> {
    const [insuranceVault, activeVaults] = await Promise.all([
      this.getOrCreateInsuranceVault(),
      this.vaultRepo.find({ where: { status: VaultStatus.ACTIVE, type: Not(VaultType.INSURANCE_FUND) } }),
    ]);

    const totalTVL = activeVaults.reduce((sum, v) => sum + Number(v.totalDeposits), 0);
    if (totalTVL === 0) return 0;
    return Number(insuranceVault.totalDeposits) / totalTVL;
  }

  async getStats(): Promise<InsuranceFundStats> {
    const insuranceVault = await this.getOrCreateInsuranceVault();
    const activeVaults = await this.vaultRepo.find({
      where: { status: VaultStatus.ACTIVE, type: Not(VaultType.INSURANCE_FUND) },
    });

    const totalTVL = activeVaults.reduce((sum, v) => sum + Number(v.totalDeposits), 0);
    const coverageRatio = totalTVL > 0 ? Number(insuranceVault.totalDeposits) / totalTVL : 0;

    const claims = await this.claimRepo.find({ where: { status: InsuranceClaimStatus.COMPLETED } });
    const totalClaimsProcessed = claims.length;
    const totalPayoutsDistributed = claims.reduce((sum, c) => sum + Number(c.payoutAmount), 0);

    return {
      fundBalance: Number(insuranceVault.totalDeposits),
      totalTVL,
      coverageRatio,
      totalClaimsProcessed,
      totalPayoutsDistributed,
    };
  }

  async getInsuranceFundBalance(): Promise<number> {
    const insuranceVault = await this.getOrCreateInsuranceVault();
    return Number(insuranceVault.totalDeposits);
  }

  async getEscrowDetails(): Promise<SorobanMultisigEscrow> {
    return this.getEscrowAccount();
  }

  async processIncident(
    adminId: string,
    adminRole: UserRole,
    losses: Record<string, number>,
    reason?: string,
  ): Promise<InsuranceClaim[]> {
    if (adminRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin may trigger incident payouts');
    }

    const validLosses = Object.entries(losses).filter(([, loss]) => loss > 0 && loss !== null);
    if (validLosses.length === 0) {
      throw new BadRequestException('No valid losses provided');
    }

    const depositorIds = validLosses.map(([id]) => id);
    const validDepositors = await this.userRepo.find({
      where: { id: In(depositorIds), isActive: true },
    });

    const validDepositorIds = new Set(validDepositors.map((u) => u.id));
    for (const depositorId of depositorIds) {
      if (!validDepositorIds.has(depositorId)) {
        this.logger.warn(`Invalid depositor ${depositorId} in incident claim`, 'InsuranceFundService');
      }
    }

    const fundVault = await this.getOrCreateInsuranceVault();
    const fundBalance = Number(fundVault.totalDeposits);

    const totalLosses = validLosses.reduce((sum, [, loss]) => sum + loss, 0);
    if (totalLosses === 0) {
      throw new BadRequestException('Total losses must be greater than zero');
    }

    const payoutFactor = fundBalance >= totalLosses ? 1 : fundBalance / totalLosses;

    const claims: InsuranceClaim[] = [];
    await this.dataSource.transaction(async (manager) => {
      for (const [depositorId, loss] of validLosses) {
        if (!validDepositorIds.has(depositorId)) continue;

        const existingClaim = await manager.findOne(InsuranceClaim, {
          where: {
            vaultId: fundVault.id,
            depositorId,
            status: In([InsuranceClaimStatus.PENDING, InsuranceClaimStatus.COMPLETED]),
          },
        });

        if (existingClaim) {
          throw new ConflictException(`Duplicate claim exists for depositor ${depositorId}`);
        }

        const payout = Math.floor(loss * payoutFactor * 100) / 100;
        if (payout <= 0) continue;

        const claim = manager.create(InsuranceClaim, {
          vaultId: fundVault.id,
          depositorId,
          lossAmount: loss,
          payoutAmount: payout,
          status: InsuranceClaimStatus.PENDING,
          reason: reason || 'Protocol incident - smart contract exploit or strategy failure',
          transactionHash: null,
        });
        await manager.save(claim);
        claims.push(claim);
        await manager.decrement(Vault, { id: fundVault.id }, 'totalDeposits', payout);
      }
    });

    await this.claimRepo.update({ id: In(claims.map((c) => c.id)) }, { status: InsuranceClaimStatus.COMPLETED });

    this.logger.log(
      `Processed incident with ${claims.length} claimants, insufficient funds: ${payoutFactor < 1}`,
      'InsuranceFundService',
    );

    return claims;
  }

  async declareIncident(adminId: string, adminRole: UserRole, incidentData: {
    vaultId: string;
    lossAmount: number;
    description: string;
  }): Promise<InsuranceClaim[]> {
    if (adminRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin may declare incidents');
    }

    const vault = await this.vaultRepo.findOne({ where: { id: incidentData.vaultId } });
    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    const deposits = await this.depositRepo.find({
      where: { vaultId: incidentData.vaultId, status: DepositStatus.CONFIRMED },
    });

    if (deposits.length === 0) {
      throw new BadRequestException('No deposits found for the specified vault');
    }

    const totalLoss = incidentData.lossAmount;
    const lossesByDepositor: Record<string, number> = {};

    const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0);
    const lossRatio = totalLoss / totalDeposits;

    for (const deposit of deposits) {
      lossesByDepositor[deposit.userId] = Number(deposit.amount) * lossRatio;
    }

    return this.processIncident(adminId, adminRole, lossesByDepositor, incidentData.description);
  }

  async getUserClaims(userId: string): Promise<InsuranceClaim[]> {
    return this.claimRepo.find({
      where: { depositorId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getClaimsByStatus(status: InsuranceClaimStatus): Promise<InsuranceClaim[]> {
    return this.claimRepo.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllClaims(): Promise<InsuranceClaim[]> {
    return this.claimRepo.find({
      relations: ['depositor', 'vault'],
      order: { createdAt: 'DESC' },
    });
  }

  async getClaimById(claimId: string): Promise<InsuranceClaim> {
    const claim = await this.claimRepo.findOne({
      where: { id: claimId },
      relations: ['depositor', 'vault'],
    });
    if (!claim) {
      throw new NotFoundException('Insurance claim not found');
    }
    return claim;
  }

  async finalizeClaim(claimId: string, adminId: string, adminRole: UserRole): Promise<InsuranceClaim> {
    if (adminRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admin may finalize claims');
    }

    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundException('Insurance claim not found');
    }

    if (claim.status === InsuranceClaimStatus.COMPLETED) {
      return claim;
    }

    claim.status = InsuranceClaimStatus.COMPLETED;
    claim.transactionHash = `payout_tx_${Date.now()}`;
    await this.claimRepo.save(claim);

    this.logger.log(`Claim ${claimId} finalized by admin ${adminId}`, 'InsuranceFundService');
    return claim;
  }

  async getAuditTrail(vaultId?: string): Promise<{
    deposits: Deposit[];
    claims: InsuranceClaim[];
  }> {
    const fundVault = await this.getOrCreateInsuranceVault();

    const deposits = await this.depositRepo.find({
      where: { vaultId: fundVault.id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const claimFilter: { vaultId: string; status?: InsuranceClaimStatus } = { vaultId: fundVault.id };
    if (vaultId) {
      claimFilter.status = InsuranceClaimStatus.COMPLETED;
    }

    const claims = await this.claimRepo.find({
      where: claimFilter,
      relations: ['depositor'],
      order: { createdAt: 'DESC' },
    });

    return { deposits, claims };
  }
}