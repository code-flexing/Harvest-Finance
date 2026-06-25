import { registerAs } from '@nestjs/config';

export default registerAs('stellar', () => ({
  network: process.env.STELLAR_NETWORK,
  secretKey: process.env.STELLAR_SECRET_KEY,
}));