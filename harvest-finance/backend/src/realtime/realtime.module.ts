import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { VaultGateway } from './vault.gateway';
import { User } from '../database/entities/user.entity';
import { Deposit } from '../database/entities/deposit.entity';
import { Withdrawal } from '../database/entities/withdrawal.entity';
import { Vault } from '../database/entities/vault.entity';
import { FarmVault } from '../database/entities/farm-vault.entity';
import { Reward } from '../database/entities/reward.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Deposit,
      Withdrawal,
      Vault,
      FarmVault,
      Reward,
    ]),
  ],
  controllers: [RealtimeController],
  providers: [RealtimeGateway, RealtimeService, VaultGateway],
  exports: [RealtimeService, VaultGateway],
})
export class RealtimeModule {}
