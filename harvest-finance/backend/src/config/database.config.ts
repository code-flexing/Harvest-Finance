import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

export default registerAs('database', (): DatabaseConfig => ({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  name: process.env.DB_NAME!,
}));
