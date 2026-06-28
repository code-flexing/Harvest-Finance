import { registerAs } from '@nestjs/config';

export interface StellarConfig {
  network: string;
  networkPassphrase: string;
  serverSecret: string;
  platformPublicKey: string;
  horizonUrl: string | undefined;
}

export default registerAs('stellar', (): StellarConfig => ({
  network: process.env.STELLAR_NETWORK!,
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
  serverSecret: process.env.STELLAR_SERVER_SECRET!,
  platformPublicKey: process.env.STELLAR_PLATFORM_PUBLIC_KEY!,
  horizonUrl: process.env.STELLAR_HORIZON_URL,
}));
