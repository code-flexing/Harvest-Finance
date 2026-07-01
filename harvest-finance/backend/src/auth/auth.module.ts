import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { SessionsController } from './sessions.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StellarStrategy } from './strategies/stellar.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { SessionsController } from './sessions.controller';
import { User } from '../database/entities/user.entity';
import { UserOAuthLink } from '../database/entities/user-oauth-link.entity';
import { Session } from '../database/entities/session.entity';
import { SecurityEvent } from '../database/entities/security-event.entity';
import { CommonModule } from '../common/common.module';
import { CustodialWallet } from '../wallets/entities/custodial-wallet.entity';
import { CustodialWalletService } from '../wallets/custodial-wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserOAuthLink, Session]),
    TypeOrmModule.forFeature([User, UserOAuthLink, CustodialWallet]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key',
        signOptions: {
          expiresIn:
            configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
    }),
    CommonModule,
  ],
  controllers: [AuthController, SessionsController],
  providers: [
    AuthService,
    JwtStrategy,
    StellarStrategy,
    GoogleStrategy,
    GithubStrategy,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    StellarStrategy,
    GoogleStrategy,
    GithubStrategy,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, StellarStrategy, GoogleStrategy, GithubStrategy, CustodialWalletService],
  exports: [AuthService, JwtStrategy, StellarStrategy, GoogleStrategy, GithubStrategy, PassportModule, CustodialWalletService],
})
export class AuthModule {}
