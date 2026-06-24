import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class StellarHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string, timeoutMs = 3000): Promise<HealthIndicatorResult> {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    const horizonUrl = network === 'mainnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';

    const server = new StellarSdk.Horizon.Server(horizonUrl);

    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Stellar Horizon ping timed out')), timeoutMs),
    );

    try {
      await Promise.race([server.ledgers().limit(1).call(), timer]);
      return this.getStatus(key, true, { url: horizonUrl });
    } catch (err) {
      throw new HealthCheckError(
        'Stellar Horizon health check failed',
        this.getStatus(key, false, { url: horizonUrl, message: (err as Error).message }),
      );
    }
  }
}
