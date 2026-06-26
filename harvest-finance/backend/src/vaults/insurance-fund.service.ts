import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, In } from 'typeorm';
import { Vault, VaultType, VaultStatus } from '../database/entities/vault.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { InsuranceClaim, InsuranceClaimStatus } from '../database/entities/insurance-claim.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

/**
 * Service responsible for managing the optional insurance fund for vaults.
 *
 * * Insurance funds are stored in a dedicated Soroban multisig escrow account –
 *   represented in this service by a special "insurance" vault (type
 *   `VaultType.INSURANCE_FUND`).
 * * Depositors can contribute to the fund via `depositToFund`.
 * * The coverage ratio is calculated as `insuranceFund.totalDeposits / totalTVL`
 *   where totalTVL is the sum of `totalDeposits` of all active vaults.
 * * In the event of an incident, an admin can trigger a pro‑rata payout to
 *   eligible depositors. Claims are recorded in the `insurance_claim` table and
 *   are fully auditable on‑chain.
 */
@Injectable()
export class InsuranceFundService {
  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepo: Repository<Vault>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    @InjectRepository(InsuranceClaim)
    private readonly claimRepo: Repository<InsuranceClaim>,
    private readonly dataSource: DataSource,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Ensure the dedicated insurance vault exists. Called lazily; creates the vault
   * on first use.
   */
  private async getOrCreateInsuranceVault(): Promise<Vault> {
    let vault = await this.vaultRepo.findOne({
      where: { type: VaultType.INSURANCE_FUND },
    });
    if (!vault) {
      vault = this.vaultRepo.create({
        ownerId: 'system-insurance', // system account placeholder
        type: VaultType.INSURANCE_FUND,
        status: VaultStatus.ACTIVE,
        vaultName: 'Insurance Fund',
        description: 'Dedicated fund for protecting depositors against protocol incidents.',
        symbol: 'INS',
        assetPair: 'XLM/USDC',
        totalDeposits: 0,
        maxCapacity: Number.MAX_SAFE_INTEGER,
        interestRate: 0,
        isPublic: false,
      });
      await this.vaultRepo.save(vault);
      this.logger.log('Created insurance fund vault', 'InsuranceFundService');
    }
    return vault;
  }

  /** Deposit user funds into the insurance fund */
  async depositToFund(userId: string, amount: number): Promise<Vault> {
    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }
    const fundVault = await this.getOrCreateInsuranceVault();
    // Record a deposit (re‑using the generic Deposit entity for auditable tracking)
    const deposit = this.depositRepo.create({
      userId,
      vaultId: fundVault.id,
      amount,
      status: 'CONFIRMED' as any, // insurance deposits are instantly confirmed
      transactionHash: null,
      stellarTransactionId: null,
      confirmedAt: new Date(),
    });
    await this.dataSource.transaction(async (manager) => {
      await manager.save(deposit);
      await manager.increment(Vault, { id: fundVault.id }, 'totalDeposits', amount);
    });
    return this.vaultRepo.findOneOrFail({ where: { id: fundVault.id } });
  }

  /** Calculate the current insurance coverage ratio */
  async getCoverageRatio(): Promise<number> {
    const [insuranceVault, activeVaults] = await Promise.all([
      this.getOrCreateInsuranceVault(),
      this.vaultRepo.find({ where: { status: VaultStatus.ACTIVE, type: Not(VaultType.INSURANCE_FUND) } }),
    ]);
    const totalTVL = activeVaults.reduce((sum, v) => sum + Number(v.totalDeposits), 0);
    if (totalTVL === 0) return 0;
    return Number(insuranceVault.totalDeposits) / totalTVL;
  }

  /**
   * Admin‑only workflow to process an incident.
   * `losses` maps depositorId => lossAmount (the amount they are owed).
   * Payouts are pro‑rata based on the insurance fund balance.
   */
  async processIncident(adminId: string, losses: Record<string, number>): Promise<InsuranceClaim[]> {
    // Simple admin check – in a real system this would be a role lookup.
    if (adminId !== 'admin') {
      throw new ForbiddenException('Only admin may trigger incident payouts');
    }
    const fundVault = await this.getOrCreateInsuranceVault();
    const fundBalance = Number(fundVault.totalDeposits);
    const totalLosses = Object.values(losses).reduce((a, b) => a + b, 0);
    if (totalLosses === 0) {
      throw new BadRequestException('No losses provided');
    }
    // Determine payout factor – if insufficient coverage, we pay proportionally.
    const payoutFactor = fundBalance >= totalLosses ? 1 : fundBalance / totalLosses;
    const claims: InsuranceClaim[] = [];
    await this.dataSource.transaction(async (manager) => {
      for (const [depositorId, loss] of Object.entries(losses)) {
        const payout = Math.floor(loss * payoutFactor * 100) / 100; // round to 2 decimals
        if (payout <= 0) continue;
        const claim = manager.create(InsuranceClaim, {
          vaultId: fundVault.id,
          depositorId,
          lossAmount: loss,
          payoutAmount: payout,
          status: InsuranceClaimStatus.PENDING,
        });
        await manager.save(claim);
        claims.push(claim);
        // Deduct from fund balance
        await manager.decrement(Vault, { id: fundVault.id }, 'totalDeposits', payout);
      }
    });
    // After transaction, mark all as COMPLETED
    await this.claimRepo.update({ id: In(claims.map(c => c.id)) }, { status: InsuranceClaimStatus.COMPLETED });
    this.logger.log(`Processed incident payouts for ${claims.length} claimants`, 'InsuranceFundService');
    return claims;
  }

  /** Retrieve all insurance claims for auditing */
  async getAllClaims(): Promise<InsuranceClaim[]> {
    return this.claimRepo.find({ order: { createdAt: 'DESC' } });
  }
}
