import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StellarStrategy } from './strategies/stellar.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { User } from '../database/entities/user.entity';
import { UserOAuthLink } from '../database/entities/user-oauth-link.entity';
import { CommonModule } from '../common/common.module';
import { CustodialWallet } from '../wallets/entities/custodial-wallet.entity';
import { CustodialWalletService } from '../wallets/custodial-wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserOAuthLink, CustodialWallet]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'super_secret_jwt_key',
      signOptions: {
        expiresIn: '1h',
      },
    }),
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, StellarStrategy, GoogleStrategy, GithubStrategy, CustodialWalletService],
  exports: [AuthService, JwtStrategy, StellarStrategy, GoogleStrategy, GithubStrategy, PassportModule, CustodialWalletService],
})
export class AuthModule {}
