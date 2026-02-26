import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Transaction } from './entities/transaction.entity';
import { Verification } from './entities/verification.entity';
import { CreditScore } from './entities/credit-score.entity';
import { CreateInitialSchema1700000000000 } from './migrations/1700000000000-CreateInitialSchema';

// Load environment variables
config();

/**
 * TypeORM Data Source Configuration
 * 
 * This is the main data source for the application.
 * Used by TypeORM for database operations.
 * 
 * For CLI commands (migrations, seeds), use this file directly.
 * For NestJS applications, use AppModule configuration.
 */
const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'harvest_finance',
  entities: [User, Order, Transaction, Verification, CreditScore],
  migrations: [CreateInitialSchema1700000000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

/**
 * AppDataSource - Singleton data source instance
 * 
 * Export this to use in CLI commands, migrations, and seeds.
 */
export const AppDataSource = new DataSource(options);

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DataSourceOptions {
  return options;
}
