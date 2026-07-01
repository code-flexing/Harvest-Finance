import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vault } from '../database/entities/vault.entity';
import { SimulateDepositDto } from './dto/simulate-deposit.dto';
import { SimulateStrategyChangeDto } from './dto/simulate-strategy-change.dto';
import { SimulationResultDto } from './dto/simulation-result.dto';

@Injectable()
export class SimulationService {
  constructor(
    @InjectRepository(Vault)
    private vaultRepository: Repository<Vault>,
  ) {}

  /**
   * Simulate a deposit without writing to database
   */
  async simulateDeposit(
    vaultId: string,
    dto: SimulateDepositDto,
  ): Promise<SimulationResultDto> {
    const vault = await this.vaultRepository.findOne({
      where: { id: vaultId },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const simulatedAt = new Date();

    // Calculate fees (assume 0.5% deposit fee for now)
    const depositFeeRate = 0.005;
    const feeAmount = Number(
      (parseFloat(dto.amount.toString()) * depositFeeRate).toFixed(8),
    );
    const netAmount = parseFloat(dto.amount.toString()) - feeAmount;

    // Calculate projected APY (use current vault interest rate)
    const projectedAPY = Number(vault.interestRate.toString());

    // Calculate lock expiry
    const lockExpiry = vault.lockPeriodEnd
      ? new Date(vault.lockPeriodEnd)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    return {
      vaultId,
      expectedNetAmount: netAmount,
      feesDeducted: feeAmount,
      projectedAPY,
      lockExpiry,
      simulatedAt,
      depositAmount: parseFloat(dto.amount.toString()),
    };
  }

  /**
   * Simulate a strategy change without writing to database
   */
  async simulateStrategyChange(
    vaultId: string,
    dto: SimulateStrategyChangeDto,
  ): Promise<SimulationResultDto> {
    const vault = await this.vaultRepository.findOne({
      where: { id: vaultId },
    });

    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    const simulatedAt = new Date();

    // Current APY
    const currentAPY = Number(vault.interestRate.toString());

    // New APY (assume new strategy has provided newAPY)
    const newAPY = dto.newAPY ? parseFloat(dto.newAPY.toString()) : currentAPY;

    // APY impact
    const apyImpact = newAPY - currentAPY;

    // Calculate rebalancing cost (assume 0.1% for internal rebalancing)
    const rebalancingRate = 0.001;
    const rebalancingCost = Number(
      (parseFloat(vault.totalDeposits.toString()) * rebalancingRate).toFixed(8),
    );

    return {
      vaultId,
      currentAPY,
      newAPY,
      apyImpact,
      rebalancingCost,
      simulatedAt,
    };
  }
}
