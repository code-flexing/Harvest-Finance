import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Vault, VaultDeposit, User } from '../database/entities';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class VaultsService {
  private readonly logger = new Logger(VaultsService.name);

  constructor(
    @InjectRepository(Vault)
    private readonly vaultRepository: Repository<Vault>,
    @InjectRepository(VaultDeposit)
    private readonly vaultDepositRepository: Repository<VaultDeposit>,
    private readonly dataSource: DataSource,
  ) {}

  async withdraw(vaultId: string, withdrawDto: WithdrawDto) {
    const { userId, amount } = withdrawDto;

    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Fetch vault and validate liquidity
      const vault = await transactionalEntityManager.findOne(Vault, {
        where: { id: vaultId },
        lock: { mode: 'pessimistic_write' }, // Lock vault to prevent concurrent balance issues
      });

      if (!vault) {
        throw new NotFoundException(`Vault with ID ${vaultId} not found`);
      }

      if (Number(vault.liquidity) < amount) {
        throw new BadRequestException('Insufficient vault liquidity');
      }

      // 2. Fetch user's deposit and validate balance
      const userDeposit = await transactionalEntityManager.findOne(VaultDeposit, {
        where: { 
          vault: { id: vaultId },
          user: { id: userId }
        },
        relations: ['user', 'vault'],
        lock: { mode: 'pessimistic_write' }, // Lock user deposit
      });

      if (!userDeposit) {
        throw new NotFoundException('User has no deposit in this vault');
      }

      if (Number(userDeposit.balance) < amount) {
        throw new BadRequestException('Insufficient user balance');
      }

      // 3. Perform updates
      userDeposit.balance = Number(userDeposit.balance) - amount;
      vault.totalDeposits = Number(vault.totalDeposits) - amount;
      vault.liquidity = Number(vault.liquidity) - amount;

      // 4. Save changes
      await transactionalEntityManager.save(VaultDeposit, userDeposit);
      const updatedVault = await transactionalEntityManager.save(Vault, vault);

      this.logger.log(
        `Withdrawal successful: User ${userId} withdrew ${amount} from Vault ${vaultId}`,
      );

      return {
        vault: updatedVault,
        userBalance: userDeposit.balance,
      };
    });
  }
}
