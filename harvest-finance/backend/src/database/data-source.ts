import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

import { User } from './entities/user.entity';
import { UserOAuthLink } from './entities/user-oauth-link.entity';
import { Session } from './entities/session.entity';
import { Order } from './entities/order.entity';
import { Transaction } from './entities/transaction.entity';
import { Verification } from './entities/verification.entity';
import { CreditScore } from './entities/credit-score.entity';
import { Deposit } from './entities/deposit.entity';
import { SorobanEvent } from './entities/soroban-event.entity';
import { Vault } from './entities/vault.entity';
import { VaultDeposit } from './entities/vault-deposit.entity';
import { Strategy } from './entities/strategy.entity';
import { VaultApyHistory } from './entities/vault-apy-history.entity';
import { VaultScoreHistory } from './entities/vault-score-history.entity';
import { VaultApproval } from './entities/vault-approval.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { Achievement } from './entities/achievement.entity';
import { Reward } from './entities/reward.entity';
import { Notification } from './entities/notification.entity';
import { FarmVault } from './entities/farm-vault.entity';
import { CropCycle } from './entities/crop-cycle.entity';
import { InsurancePlan } from './entities/insurance-plan.entity';
import { InsuranceSubscription } from './entities/insurance-subscription.entity';
import { YieldAnalytics } from './entities/yield-analytics.entity';
import { CommunityPost } from './entities/community-post.entity';
import { CommunityComment } from './entities/community-comment.entity';
import { PostReaction } from './entities/post-reaction.entity';
import { CommunityGroup } from './entities/community-group.entity';
import { GroupMembership } from './entities/group-membership.entity';
import { CoopListing } from './entities/coop-listing.entity';
import { CoopOrder } from './entities/coop-order.entity';
import { CoopReview } from './entities/coop-review.entity';
import { VaultReservation } from '../vaults/entities/vault-reservation.entity';

import { CreateInitialSchema1700000000000 } from './migrations/1700000000000-CreateInitialSchema';
import { CreateSorobanEvents1700000000011 } from './migrations/1700000000011-CreateSorobanEvents';
import { AddSorobanEventQueryIndexes1700000000013 } from './migrations/1700000000013-AddSorobanEventQueryIndexes';
import { CreateDepositEvents1700000000016 } from './migrations/1700000000016-CreateDepositEvents';
import { CreateStrategyAndApyHistory1700000000017 } from './migrations/1700000000017-CreateStrategyAndApyHistory';
import { CreateVaultScoreHistory1700000000018 } from './migrations/1700000000018-CreateVaultScoreHistory';
import { CreateVaultReservations1700000000018 } from './migrations/1700000000018-CreateVaultReservations';
import { CreateSessionsAndOAuthLinks1700000000022 } from './migrations/1700000000022-CreateSessionsAndOAuthLinks';

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

  entities: [
    User,
    UserOAuthLink,
    Session,
    Order,
    Transaction,
    Verification,
    CreditScore,
    Vault,
    VaultDeposit,
    Strategy,
    VaultApyHistory,
    VaultScoreHistory,
    VaultApproval,
    VaultReservation,
    Deposit,
    SorobanEvent,
    IndexerState,
    YieldAnalytics,
    CommunityPost,
    CommunityComment,
    PostReaction,
    CommunityGroup,
    GroupMembership,
    CoopListing,
    CoopOrder,
    CoopReview,
  ],

  migrations: [
    CreateInitialSchema1700000000000,
    CreateSorobanEvents1700000000011,
    AddSorobanEventQueryIndexes1700000000013,
    CreateDepositEvents1700000000016,
    CreateStrategyAndApyHistory1700000000017,
    CreateVaultScoreHistory1700000000018,
    CreateVaultReservations1700000000018,
    CreateSessionsAndOAuthLinks1700000000022,
  ],

  // synchronize must remain false in all non-test environments.
  // Use `npm run migration:run` to apply schema changes safely.
  synchronize: isTestEnv,
  migrationsRun: false,
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