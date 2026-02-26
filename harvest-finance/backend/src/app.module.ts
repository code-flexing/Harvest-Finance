import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';
import { VerificationModule } from './verification/verification.module';
import { DatabaseModule } from './database/database.module';
import { User, Order, Transaction, Verification, CreditScore } from './database/entities';
import { CreateInitialSchema1700000000000 } from './database/migrations/1700000000000-CreateInitialSchema';

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
        entities: [User, Order, Transaction, Verification, CreditScore],
        migrations: [CreateInitialSchema1700000000000],
        synchronize: false, // Disable auto-sync, use migrations
        migrationsRun: false, // Run migrations manually
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST'),
            port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
          },
        });
        return {
          store,
        };
      },
      inject: [ConfigService],
    }),
    HealthModule,
    OrdersModule,
    VerificationModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
