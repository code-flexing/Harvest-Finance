import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { User, UserRole } from '../database/entities/user.entity';
import { UserOAuthLink } from '../database/entities/user-oauth-link.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthResponseDto,
  UserResponseDto,
  TokenResponseDto,
} from './dto/auth-response.dto';
import {
  StellarChallengeDto,
  StellarVerifyDto,
  StellarAuthResponseDto,
  StellarChallengeResponseDto,
} from './dto/stellar-auth.dto';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly accessTokenExpiry = '1h';
  private readonly refreshTokenExpiry = '7d';
  private readonly resetTokenExpiry = 3600000; // 1 hour in milliseconds

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOAuthLink)
    private oauthLinkRepository: Repository<UserOAuthLink>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private logger: CustomLoggerService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, role, full_name, phone_number, stellar_address } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(
        `Failed registration attempt: Email already exists (${email})`,
        'AuthService',
      );
      throw new ConflictException('User with this email already exists');
    }

    // Parse full name into first and last name
    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create new user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      role: role,
      firstName,
      lastName,
      phone: phone_number || null,
      stellarAddress: stellar_address,
      isActive: true,
    });

    // Save user
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`New user registered: ${email}`, 'AuthService');

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user with password
    const user = await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'role',
        'firstName',
        'lastName',
        'phone',
        'stellarAddress',
        'isActive',
      ],
    });

    if (!user) {
      this.logger.warn(
        `Failed login attempt for email: ${email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(
        `Login attempt for deactivated account: ${email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt for email (invalid password): ${email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLogin: new Date() });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in successfully: ${email}`, 'AuthService');

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    const { refresh_token } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refresh_token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super_secret_refresh_jwt_key',
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        {
          expiresIn: this.accessTokenExpiry,
          secret:
            this.configService.get<string>('JWT_SECRET') ||
            'super_secret_jwt_key',
        },
      );

      return { access_token: accessToken, token_type: 'Bearer' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Decode token to get expiration
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'super_secret_jwt_key',
      });

      // Calculate TTL (time to live) in seconds
      const exp = payload.exp * 1000;
      const ttl = Math.max(0, Math.floor((exp - Date.now()) / 1000));

      if (ttl > 0) {
        // Blacklist the token
        await this.cacheManager.set(`blacklist:${token}`, true, ttl);
      }

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      // Even if token is invalid, we can still return success
      return { success: true, message: 'Logged out successfully' };
    }
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const { email } = forgotPasswordDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a reset link will be sent',
      };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const hashedResetToken = await bcrypt.hash(resetToken, this.saltRounds);

    // Store hashed reset token
    await this.userRepository.update(user.id, {
      resetPasswordToken: hashedResetToken,
      resetPasswordExpires: new Date(Date.now() + this.resetTokenExpiry),
    });

    // In production, send email with reset token
    // For now, we'll log it
    this.logger.log(
      `Password reset token for ${email}: ${resetToken}`,
      'AuthService',
    );

    return {
      success: true,
      message: 'If the email exists, a reset link will be sent',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const { token, new_password } = resetPasswordDto;

    // Find users with active reset tokens
    const activeUsers = await this.userRepository.find({
      where: {
        resetPasswordExpires: MoreThan(new Date()),
      },
      select: ['id', 'password', 'resetPasswordToken', 'resetPasswordExpires'],
    });

    let user: User | null = null;
    for (const u of activeUsers) {
      if (
        u.resetPasswordToken &&
        (await bcrypt.compare(token, u.resetPasswordToken))
      ) {
        user = u;
        break;
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, this.saltRounds);

    // Update password and clear reset token
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    // Invalidate all sessions by blacklisting current token
    // (in production, you'd implement a more comprehensive session invalidation)

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  /**
   * Validate user (for JWT strategy)
   */
  async validateUser(userId: string, email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, email },
    });
    return user || null;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.accessTokenExpiry,
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'super_secret_jwt_key',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.refreshTokenExpiry,
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super_secret_refresh_jwt_key',
      }),
    ]);

    // Store refresh token in database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, this.saltRounds);
    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Map user entity to response DTO
   */
  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
      phone_number: user.phone,
      stellar_address: user.stellarAddress,
    };
  }

  /**
   * Validate or create an OAuth user on callback, linking accounts if email matches.
   */
  async validateOrCreateOAuthUser(
    oauthProvider: string,
    oauthId: string,
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    // 1. Check if OAuth link already exists
    let existingLink = await this.oauthLinkRepository.findOne({
      where: { oauthProvider, oauthId },
      relations: ['user'],
    });

    if (existingLink) {
      // Update last login
      await this.userRepository.update(existingLink.user.id, { lastLogin: new Date() });
      return existingLink.user;
    }

    // 2. Check if a user with the same email exists
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Create a new user on first login
      const randomPassword = randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, this.saltRounds);

      user = this.userRepository.create({
        email,
        password: hashedPassword,
        role: UserRole.BUYER, // default role
        firstName: firstName || null,
        lastName: lastName || null,
        isActive: true,
      });

      user = await this.userRepository.save(user);
      this.logger.log(`Created new OAuth user: ${email} via ${oauthProvider}`, 'AuthService');
    } else {
      this.logger.log(`Linking existing user: ${email} to OAuth provider ${oauthProvider}`, 'AuthService');
    }

    // 3. Link OAuth provider to the user
    const link = this.oauthLinkRepository.create({
      userId: user.id,
      oauthProvider,
      oauthId,
    });
    await this.oauthLinkRepository.save(link);

    // Update last login
    await this.userRepository.update(user.id, { lastLogin: new Date() });

    return user;
  }

  /**
   * Log in user via OAuth and generate access/refresh tokens.
   */
  async loginWithOAuth(user: User): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: this.mapUserToResponse(user),
    };
  }
}
