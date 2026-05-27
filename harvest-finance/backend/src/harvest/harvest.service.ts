import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { CustomLoggerService } from '../logger/custom-logger.service';

@Injectable()
export class HarvestService implements OnModuleInit {
  private readonly logger = new Logger(HarvestService.name);
  private provider: ethers.JsonRpcProvider;
  private controllerContract: ethers.Contract;
  private signer: ethers.Signer;
  private isRunning = false;

  constructor(
    private configService: ConfigService,
    private customLogger: CustomLoggerService,
  ) {}

  async onModuleInit() {
    await this.initializeBlockchainConnection();
  }

  private async initializeBlockchainConnection() {
    try {
      const rpcUrl =
        this.configService.get<string>('BLOCKCHAIN_RPC_URL') ||
        'http://localhost:8545';
      const privateKey = this.configService.get<string>('HARVEST_PRIVATE_KEY');
      const controllerAddress = this.configService.get<string>(
        'CONTROLLER_CONTRACT_ADDRESS',
      );

      if (!privateKey || !controllerAddress) {
        this.logger.error(
          'Missing blockchain configuration: HARVEST_PRIVATE_KEY or CONTROLLER_CONTRACT_ADDRESS',
        );
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Controller ABI - simplified for doHardWork function
      const controllerAbi = [
        'function doHardWork(address vault) external',
        'function vaults(address) view returns (bool)',
        'function strategies(address) view returns (address)',
      ];

      this.controllerContract = new ethers.Contract(
        controllerAddress,
        controllerAbi,
        this.signer,
      );

      this.logger.log('Blockchain connection initialized for harvest service');
    } catch (error) {
      this.logger.error('Failed to initialize blockchain connection', error);
    }
  }

  async performHarvest(
    vaultAddress: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (this.isRunning) {
      this.logger.warn('Harvest already running, skipping duplicate execution');
      return { success: false, error: 'Harvest already running' };
    }

    if (!this.controllerContract) {
      const error = 'Blockchain connection not initialized';
      this.logger.error(error);
      return { success: false, error };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log(`Starting harvest for vault: ${vaultAddress}`);
      this.customLogger.log(
        `Harvest job started for vault ${vaultAddress}`,
        'HarvestService',
      );

      // Check if vault is registered
      const isVaultRegistered =
        await this.controllerContract.vaults(vaultAddress);
      if (!isVaultRegistered) {
        throw new Error(
          `Vault ${vaultAddress} is not registered with the controller`,
        );
      }

      // Check if strategy exists
      const strategyAddress =
        await this.controllerContract.strategies(vaultAddress);
      if (strategyAddress === ethers.ZeroAddress) {
        throw new Error(`No strategy set for vault ${vaultAddress}`);
      }

      // Perform the harvest
      const tx = await this.controllerContract.doHardWork(vaultAddress);
      this.logger.log(`Harvest transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      this.logger.log(
        `Harvest transaction confirmed in block ${receipt.blockNumber}`,
      );

      const duration = Date.now() - startTime;
      this.customLogger.log(
        `Harvest job completed successfully for vault ${vaultAddress}. Duration: ${duration}ms, TxHash: ${tx.hash}`,
        'HarvestService',
      );

      return { success: true, txHash: tx.hash };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Harvest failed for vault ${vaultAddress}: ${errorMessage}`,
      );
      this.customLogger.log(
        `Harvest job failed for vault ${vaultAddress}. Duration: ${duration}ms, Error: ${errorMessage}`,
        'HarvestService',
      );

      return { success: false, error: errorMessage };
    } finally {
      this.isRunning = false;
    }
  }

  async harvestAllVaults(): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: any[];
  }> {
    // This would need to be implemented to get all vault addresses from the database
    // For now, return empty result
    this.logger.log('harvestAllVaults called - not yet implemented');
    return { total: 0, successful: 0, failed: 0, results: [] };
  }
}
