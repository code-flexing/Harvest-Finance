import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';
import { VerificationModule } from './verification/verification.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VaultsModule } from './vaults/vaults.module';
import { FarmIntelligenceModule } from './farm-intelligence/farm-intelligence.module';
import { AchievementsModule } from './achievements/achievements.module';
import { RewardsModule } from './rewards/rewards.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExportModule } from './export/export.module';
import { FarmVaultsModule } from './farm-vaults/farm-vaults.module';
import {
  User,
  Order,
  Transaction,
  Verification,
  CreditScore,
  Vault,
  Deposit,
  Notification,
  Achievement,
  Reward,
  Withdrawal,
  CropCycle,
  FarmVault,
} from './database/entities';
import { CreateInitialSchema1700000000000 } from './database/migrations/1700000000000-CreateInitialSchema';
import { CreateAchievements1700000000004 } from './database/migrations/1700000000004-CreateAchievements';
import { CreateRewards1700000000005 } from './database/migrations/1700000000005-CreateRewards';
import { CreateVaultsAndDeposits1700000000003 } from './database/migrations/1700000000003-CreateVaultsAndDeposits';
import { CreateNotifications1700000000006 } from './database/migrations/1700000000006-CreateNotifications';
import { CreateWithdrawals1700000000007 } from './database/migrations/1700000000007-CreateWithdrawals';
import { CreateFarmVaults1700000000008 } from './database/migrations/1700000000008-CreateFarmVaults';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          User,
          Order,
          Transaction,
          Verification,
          CreditScore,
          Vault,
          Deposit,
          Achievement,
          Reward,
          Notification,
          Withdrawal,
          CropCycle,
          FarmVault,
        ],
        migrations: [
          CreateInitialSchema1700000000000,
          CreateVaultsAndDeposits1700000000003,
          CreateAchievements1700000000004,
          CreateRewards1700000000005,
          CreateNotifications1700000000006,
          CreateWithdrawals1700000000007,
          CreateFarmVaults1700000000008,
        ],
        synchronize: false, // Disable auto-sync, use migrations
        migrationsRun: false, // Run migrations manually
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 600, // 10 minutes
      max: 100, // maximum number of items in cache
    }),
    AuthModule,
    UsersModule,
    VaultsModule,
    HealthModule,
    OrdersModule,
    VerificationModule,
    DatabaseModule,
    FarmIntelligenceModule,
    AchievementsModule,
    RewardsModule,
    NotificationsModule,
    AdminModule,
    ExportModule,
    FarmVaultsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
