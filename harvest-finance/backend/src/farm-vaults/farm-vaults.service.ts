import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  FarmVault,
  FarmVaultStatus,
} from '../database/entities/farm-vault.entity';
import { CropCycle } from '../database/entities/crop-cycle.entity';
import { VaultGateway } from '../realtime/vault.gateway';

@Injectable()
export class FarmVaultsService {
  constructor(
    @InjectRepository(FarmVault)
    private farmVaultRepository: Repository<FarmVault>,
    @InjectRepository(CropCycle)
    private cropCycleRepository: Repository<CropCycle>,
    private dataSource: DataSource,
    private vaultGateway: VaultGateway,
  ) {}

  async createVault(
    userId: string,
    data: { name: string; cropCycleId: string; targetAmount: number },
  ) {
    const cropCycle = await this.cropCycleRepository.findOne({
      where: { id: data.cropCycleId },
    });
    if (!cropCycle) {
      throw new NotFoundException('Crop cycle not found');
    }

    const vault = this.farmVaultRepository.create({
      userId,
      name: data.name,
      cropCycleId: data.cropCycleId,
      targetAmount: data.targetAmount,
      balance: 0,
      startDate: new Date(),
      status: FarmVaultStatus.ACTIVE,
    });

    return this.farmVaultRepository.save(vault);
  }

  async deposit(vaultId: string, userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    const vault = await this.farmVaultRepository.findOne({
      where: { id: vaultId, userId },
    });
    if (!vault) {
      throw new NotFoundException('Farm vault not found');
    }

    vault.balance = Number(vault.balance) + amount;
    const saved = await this.farmVaultRepository.save(vault);

    // Emit real-time deposit event
    this.vaultGateway.emitDeposit({
      vaultId,
      vaultName: vault.name,
      amount,
      userId,
      newBalance: Number(saved.balance),
    });

    // Check milestone progress and emit if crossed
    const progressPercentage = Math.round(
      (Number(saved.balance) / Number(vault.targetAmount)) * 100,
    );
    const milestones = [25, 50, 75, 100];
    const prevProgress = Math.round(
      ((Number(saved.balance) - amount) / Number(vault.targetAmount)) * 100,
    );
    for (const target of milestones) {
      if (prevProgress < target && progressPercentage >= target) {
        this.vaultGateway.emitMilestone({
          vaultId,
          vaultName: vault.name,
          milestone: `${target}% savings target reached`,
          userId,
        });
      }
    }

    return saved;
  }

  async withdraw(vaultId: string, userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than 0');
    }

    const vault = await this.farmVaultRepository.findOne({
      where: { id: vaultId, userId },
    });
    if (!vault) {
      throw new NotFoundException('Farm vault not found');
    }

    if (Number(vault.balance) < amount) {
      throw new BadRequestException('Insufficient balance in farm vault');
    }

    vault.balance = Number(vault.balance) - amount;
    return this.farmVaultRepository.save(vault);
  }

  async getUserVaults(userId: string) {
    const vaults = await this.farmVaultRepository.find({
      where: { userId },
      relations: ['cropCycle'],
      order: { createdAt: 'DESC' },
    });

    return vaults.map((v) => this.calculateProjections(v));
  }

  async getCropCycles() {
    return this.cropCycleRepository.find();
  }

  private calculateProjections(vault: FarmVault) {
    const now = new Date();
    const startDate = new Date(vault.startDate);
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const durationDays = vault.cropCycle.durationDays;
    const yieldRate = Number(vault.cropCycle.yieldRate);
    const balance = Number(vault.balance);

    // Progressive growth based on time elapsed in the cycle
    const progressFactor = Math.min(1, diffDays / durationDays);
    const progressPercentage = Math.round(progressFactor * 100);
    const currentGrowth = balance * yieldRate * progressFactor;
    const totalProjectedGrowth = balance * yieldRate;

    const milestones = [
      { name: 'Seed Funding', target: 25, achieved: progressPercentage >= 25 },
      { name: 'Early Growth', target: 50, achieved: progressPercentage >= 50 },
      {
        name: 'Mid-Season Bloom',
        target: 75,
        achieved: progressPercentage >= 75,
      },
      {
        name: 'Harvest Ready',
        target: 100,
        achieved: progressPercentage >= 100,
      },
    ];

    return {
      ...vault,
      projections: {
        daysElapsed: diffDays,
        daysRemaining: Math.max(0, durationDays - diffDays),
        progressPercentage,
        currentGrowth: Number(currentGrowth.toFixed(2)),
        totalProjectedGrowth: Number(totalProjectedGrowth.toFixed(2)),
        estimatedTotalAtMaturity: Number(
          (balance + totalProjectedGrowth).toFixed(2),
        ),
        milestones,
      },
    };
  }
}
