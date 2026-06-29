import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vault } from './entities/vault.entity';
import { VaultLeaderboardEntryDto, VaultResponseDto } from './dto/vault-response.dto';

@Injectable()
export class VaultsService {
  private readonly logger = new Logger(VaultsService.name);

  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
  ) {}

  /**
   * Retrieve all vaults including their TVL watermark fields.
   */
  async findAll(): Promise<VaultResponseDto[]> {
    const vaults = await this.vaultRepository.find({
      order: { createdAt: 'DESC' },
    });
    return vaults.map(this.toResponseDto);
  }

  /**
   * Retrieve a single vault by ID including its TVL watermark fields.
   *
   * @throws NotFoundException if the vault does not exist
   */
  async findOne(id: string): Promise<VaultResponseDto> {
    const vault = await this.vaultRepository.findOne({ where: { id } });
    if (!vault) {
      throw new NotFoundException(`Vault with id ${id} not found`);
    }
    return this.toResponseDto(vault);
  }

  /**
   * Process a deposit into a vault.
   *
   * After recalculating the vault's total assets (TVL), checks whether the
   * new TVL exceeds the current all-time high watermark. If so, the watermark
   * and its achieved timestamp are updated atomically.
   *
   * The watermark is monotonically increasing — it is never decreased.
   *
   * @param vaultId  - ID of the vault receiving the deposit
   * @param amount   - Deposit amount as a decimal string
   * @returns Updated vault response DTO
   *
   * @throws NotFoundException if the vault does not exist
   */
  async deposit(vaultId: string, amount: string): Promise<VaultResponseDto> {
    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) {
      throw new NotFoundException(`Vault with id ${vaultId} not found`);
    }

    // Recalculate TVL after deposit using BigInt-safe arithmetic
    const currentTvl = parseFloat(vault.totalAssets || '0');
    const depositAmount = parseFloat(amount);
    const newTvl = currentTvl + depositAmount;

    vault.totalAssets = newTvl.toFixed(18);

    // Update watermark only if new TVL exceeds current all-time high
    // Monotonically increasing — never decrease the watermark
    const currentWatermark = parseFloat(vault.tvlAtHighWatermark || '0');
    if (newTvl > currentWatermark) {
      vault.tvlAtHighWatermark = newTvl.toFixed(18);
      vault.watermarkAchievedAt = new Date();

      this.logger.log(
        `[VaultsService] New TVL watermark set for vault ${vaultId}: ${vault.tvlAtHighWatermark} at ${vault.watermarkAchievedAt.toISOString()}`,
      );
    }

    const saved = await this.vaultRepository.save(vault);
    return this.toResponseDto(saved);
  }

  /**
   * Return all vaults ranked by their all-time high TVL watermark descending.
   *
   * This leaderboard surfaces the most historically significant vaults as a
   * social proof metric for users evaluating vault popularity and traction.
   *
   * @returns Ranked list of vaults with watermark data
   */
  async getLeaderboard(): Promise<VaultLeaderboardEntryDto[]> {
    const vaults = await this.vaultRepository.find({
      order: { tvlAtHighWatermark: 'DESC' },
    });

    return vaults.map((vault, index) => ({
      rank: index + 1,
      id: vault.id,
      name: vault.name,
      tvlAtHighWatermark: vault.tvlAtHighWatermark,
      watermarkAchievedAt: vault.watermarkAchievedAt,
      totalAssets: vault.totalAssets,
    }));
  }

  /**
   * Map a Vault entity to a VaultResponseDto.
   */
  private toResponseDto(vault: Vault): VaultResponseDto {
    return {
      id: vault.id,
      name: vault.name,
      tokenAddress: vault.tokenAddress,
      ownerId: vault.ownerId,
      totalAssets: vault.totalAssets,
      tvlAtHighWatermark: vault.tvlAtHighWatermark,
      watermarkAchievedAt: vault.watermarkAchievedAt,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    };
  }
}
