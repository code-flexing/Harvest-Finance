import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from './entities/user.entity';
import { UserOAuthLink } from './entities/user-oauth-link.entity';
import { Order } from './entities/order.entity';
import { Transaction } from './entities/transaction.entity';
import { Verification } from './entities/verification.entity';
import { CreditScore } from './entities/credit-score.entity';
import { Deposit } from './entities/deposit.entity';
import { DepositEvent } from './entities/deposit-event.entity';
import { SorobanEvent } from './entities/soroban-event.entity';
import { Vault } from './entities/vault.entity';
import { VaultDeposit } from './entities/vault-deposit.entity';
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
import { CreateAchievements1700000000004 } from './migrations/1700000000004-CreateAchievements';
import { CreateRewards1700000000005 } from './migrations/1700000000005-CreateRewards';
import { CreateNotifications1700000000006 } from './migrations/1700000000006-CreateNotifications';
import { CreateWithdrawals1700000000007 } from './migrations/1700000000007-CreateWithdrawals';
import { CreateFarmVaults1700000000008 } from './migrations/1700000000008-CreateFarmVaults';
import { CreateInsurance1700000000009 } from './migrations/1700000000009-CreateInsurance';
import { AddInsuranceNotificationType1700000000010 } from './migrations/1700000000010-AddInsuranceNotificationType';
import { CreateSorobanEvents1700000000011 } from './migrations/1700000000011-CreateSorobanEvents';
import { CreateYieldAnalytics1700000000012 } from './migrations/1700000000012-CreateYieldAnalytics';
import { AddSorobanEventQueryIndexes1700000000013 } from './migrations/1700000000013-AddSorobanEventQueryIndexes';
import { CreateDepositEvents1700000000016 } from './migrations/1700000000016-CreateDepositEvents';
import { CreateVaultReservations1700000000018 } from './migrations/1700000000018-CreateVaultReservations';

// Load environment variables explicitly for CLI usage
config();

const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * TypeORM Data Source for CLI commands (migration:generate, migration:run, migration:revert).
 *
 * Usage:
 *   npm run migration:generate -- src/database/migrations/<MigrationName>
 *   npm run migration:run
 *   npm run migration:revert
 *
 * IMPORTANT: synchronize is disabled in all non-test environments.
 * Schema changes must be applied through versioned migration files.
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
    Order,
    Transaction,
    Verification,
    CreditScore,
    Vault,
    VaultDeposit,
    VaultApproval,
    VaultReservation,
    Deposit,
    DepositEvent,
    Withdrawal,
    Achievement,
    Reward,
    Notification,
    FarmVault,
    CropCycle,
    InsurancePlan,
    InsuranceSubscription,
    SorobanEvent,
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
    CreateAchievements1700000000004,
    CreateRewards1700000000005,
    CreateNotifications1700000000006,
    CreateWithdrawals1700000000007,
    CreateFarmVaults1700000000008,
    CreateInsurance1700000000009,
    AddInsuranceNotificationType1700000000010,
    CreateSorobanEvents1700000000011,
    CreateYieldAnalytics1700000000012,
    AddSorobanEventQueryIndexes1700000000013,
    CreateDepositEvents1700000000016,
    CreateVaultReservations1700000000018,
  ],
  // synchronize must remain false in all non-test environments.
  // Use `npm run migration:run` to apply schema changes safely.
  synchronize: isTestEnv,
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'development',
};

export const AppDataSource = new DataSource(options);

export function getDatabaseConfig(): DataSourceOptions {
  return options;
}
