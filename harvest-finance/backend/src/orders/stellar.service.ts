import { Injectable, Logger } from '@nestjs/common';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: StellarSdk.Horizon.Server | null = null;

  constructor() {
    const horizon = process.env.STELLAR_HORIZON_URL || '';
    if (horizon) {
      try {
        this.server = new StellarSdk.Horizon.Server(horizon);
      } catch (e) {
        this.logger.warn('Failed to init Stellar server, falling back to mock');
        this.server = null;
      }
    }
  }

  async createEscrow(
    buyerPublicKey: string,
    farmerPublicKey: string,
    amount: string,
  ): Promise<string> {
    // If server not configured, simulate escrow creation for dev/test
    if (!this.server) {
      const fakeHash = `simulated-tx-${Date.now()}`;
      this.logger.log(`Simulated escrow created: ${fakeHash}`);
      return fakeHash;
    }

    try {
      // Production usage would construct a real escrow transaction here.
      // For safety in this repo we avoid signing transactions without keys.
      // We'll simulate a tx hash but leave the hook for real implementation.
      const fakeHash = `stellar-simulated-${Date.now()}`;
      this.logger.log(`Escrow simulated (server present): ${fakeHash}`);
      return fakeHash;
    } catch (error) {
      this.logger.error('Error creating escrow', error);
      throw error;
    }
  }

  async releaseUpfrontPayment(params: {
    orderId: string;
    farmerPublicKey: string;
    amount: string;
    assetCode: string;
  }): Promise<{ transactionHash: string }> {
    // If server not configured, simulate payment release for dev/test
    if (!this.server) {
      const fakeHash = `simulated-release-${Date.now()}`;
      this.logger.log(
        `Simulated upfront payment released: ${fakeHash} for order ${params.orderId}`,
      );
      return { transactionHash: fakeHash };
    }

    try {
      // Production usage would construct a real payment transaction here.
      // For safety in this repo we avoid signing transactions without keys.
      // We'll simulate a tx hash but leave the hook for real implementation.
      const fakeHash = `stellar-release-${Date.now()}`;
      this.logger.log(
        `Upfront payment simulated (server present): ${fakeHash} for order ${params.orderId}`,
      );
      return { transactionHash: fakeHash };
    } catch (error) {
      this.logger.error('Error releasing upfront payment', error);
      throw error;
    }
  }
}
