import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import {
  ChainAdapter,
  ChainYield,
} from '../interfaces/chain-adapter.interface';

/**
 * Polygon implementation of `ChainAdapter`. Reads ERC-20 vault token balances
 * via ethers.js and maps them to `ChainYield` positions for users with a
 * linked `polygonAddress`.
 */
@Injectable()
export class PolygonYieldAdapter implements ChainAdapter {
  readonly chain = 'polygon';

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async getYieldsForUser(userId: string): Promise<ChainYield[]> {
    try {
      const wallet = await this.resolveWallet(userId);
      if (!wallet) return [];

      const rpcUrl = this.config.get<string>('POLYGON_RPC_URL');
      if (!rpcUrl) return [];

      const vaultConfigs = this.parseVaultConfigs(
        this.config.get<string>('POLYGON_VAULT_CONFIGS'),
      );
      if (vaultConfigs.length === 0) return [];

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const yields: ChainYield[] = [];

      for (const vault of vaultConfigs) {
        try {
          const contract = new ethers.Contract(
            vault.vaultAddress,
            ['function balanceOf(address) view returns (uint256)'],
            provider,
          );

          const balance = await contract.balanceOf(wallet);
          const principal = Number(ethers.formatUnits(balance, vault.decimals));

          if (principal <= 0) continue;

          yields.push({
            chain: this.chain,
            positionId: vault.vaultAddress,
            positionName: vault.name,
            principal: principal.toFixed(7),
            asset: {
              code: vault.assetCode,
              issuer: vault.vaultAddress,
            },
            apr: vault.apr ?? null,
            estimatedAnnualYield:
              vault.apr != null
                ? ((principal * vault.apr) / 100).toFixed(7)
                : null,
            metadata: {
              vaultAddress: vault.vaultAddress,
              decimals: vault.decimals,
            },
          });
        } catch {
          continue;
        }
      }

      return yields;
    } catch {
      return [];
    }
  }

  private async resolveWallet(userId: string): Promise<string | null> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: ['id', 'polygonAddress'],
    });
    const address = (user as any)?.polygonAddress?.trim();
    return address && address.length > 0 ? address : null;
  }

  private parseVaultConfigs(
    configStr: string | undefined,
  ): Array<{
    vaultAddress: string;
    name: string;
    assetCode: string;
    decimals: number;
    apr: number | null;
  }> {
    if (!configStr) return [];

    try {
      const configs = JSON.parse(configStr);
      return Array.isArray(configs) ? configs : [];
    } catch {
      return [];
    }
  }
}
