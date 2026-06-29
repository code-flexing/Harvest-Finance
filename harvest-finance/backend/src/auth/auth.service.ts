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
import { v4 as uuidv4 } from 'uuid';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { User, UserRole, WalletType } from '../database/entities/user.entity';
import { UserOAuthLink } from '../database/entities/user-oauth-link.entity';
const zxcvbn = require('zxcvbn');
import * as crypto from 'crypto';
import { Session } from '../database/entities/session.entity';
import { SecurityEvent, SecurityEventType } from '../database/entities/security-event.entity';
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
import { CustodialWalletService } from '../wallets/custodial-wallet.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly accessTokenExpiry = '1h';
  private readonly refreshTokenExpiry = '7d';
  private readonly refreshTokenExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly resetTokenExpiry = 3600000; // 1 hour in milliseconds

  private get maxLoginAttempts(): number {
    return this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
  }

  private get lockoutWindowMs(): number {
    return this.configService.get<number>('LOCKOUT_WINDOW_MINUTES', 15) * 60 * 1000;
  }

  private get lockoutDurationMs(): number {
    return this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30) * 60 * 1000;
  }

  private lockoutAttemptsKey(userId: string): string {
    return `lockout:attempts:${userId}`;
  }

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOAuthLink)
    private oauthLinkRepository: Repository<UserOAuthLink>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private logger: CustomLoggerService,
    private custodialWalletService: CustodialWalletService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, role, full_name, phone_number, stellar_address, use_custodial_wallet } =
      registerDto;

    // Validate: user must supply either a stellar_address OR opt into a custodial wallet
    if (!stellar_address && !use_custodial_wallet) {
      throw new BadRequestException(
        'Please provide a Stellar address or opt into a platform-managed custodial wallet (use_custodial_wallet: true).',
      );
    }

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

    await this.validatePasswordStrength(password);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Determine wallet type and Stellar address
    // Self-custody takes precedence when both fields are supplied.
    const isSelfCustody = !!stellar_address;
    const walletType = isSelfCustody ? WalletType.SELF_CUSTODY : WalletType.CUSTODIAL;

    // Create new user (without stellarAddress for custodial — we set it after wallet creation)
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      role: role,
      firstName,
      lastName,
      phone: phone_number || null,
      stellarAddress: stellar_address ?? null,
      walletType,
      isActive: true,
    });

    // Save user
    await this.userRepository.save(user);

    // Create custodial wallet if requested and no self-custody address provided
    if (!isSelfCustody && use_custodial_wallet) {
      try {
        const publicKey = await this.custodialWalletService.createCustodialWallet(
          user.id,
          password, // plaintext password — used for key derivation before bcrypt hashing
        );
        // Link the generated public key to the user record
        await this.userRepository.update(user.id, { stellarAddress: publicKey });
        user.stellarAddress = publicKey;
        this.logger.log(
          `Custodial wallet created for new user ${email}: ${publicKey}`,
          'AuthService',
        );
      } catch (err) {
        // Clean up: delete the partially-created user to keep the DB consistent
        await this.userRepository.delete(user.id);
        this.logger.error(
          `Failed to create custodial wallet for ${email}: ${err.message}`,
          'AuthService',
        );
        throw err;
      }
    }

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
        'lockedUntil',
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

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      this.logger.warn(
        `Login attempt for locked account: ${email} (locked for ${remainingMin} more minute(s))`,
        'AuthService',
      );
      throw new UnauthorizedException(
        `Account is locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt for email (invalid password): ${email}`,
        'AuthService',
      );
      await this.recordFailedAttempt(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset failure counter and clear any expired lock
    await this.resetLoginAttempts(user.id);

    // Update last login
    await this.userRepository.update(user.id, { lastLogin: new Date(), lockedUntil: null });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in successfully: ${email}`, 'AuthService');

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: this.mapUserToResponse(user),
    };
  }

  private async recordFailedAttempt(user: User): Promise<void> {
    const key = this.lockoutAttemptsKey(user.id);
    const windowSec = Math.ceil(this.lockoutWindowMs / 1000);

    const current = await this.cacheManager.get<number>(key) ?? 0;
    const next = current + 1;

    await this.cacheManager.set(key, next, windowSec);

    if (next >= this.maxLoginAttempts) {
      const lockedUntil = new Date(Date.now() + this.lockoutDurationMs);
      await this.userRepository.update(user.id, { lockedUntil });
      await this.cacheManager.del(key);

      this.logger.warn(
        JSON.stringify({
          event: 'account_locked',
          userId: user.id,
          email: user.email,
          lockedUntil: lockedUntil.toISOString(),
          reason: `${this.maxLoginAttempts} consecutive failed login attempts`,
        }),
        'AuthService',
      );

      // In-app notification (email would be sent here if mail service were configured)
      this.logger.error(
        `NOTIFY user ${user.email}: account locked until ${lockedUntil.toISOString()}`,
        'AuthService',
      );
    }
  }

  private async resetLoginAttempts(userId: string): Promise<void> {
    await this.cacheManager.del(this.lockoutAttemptsKey(userId));
  }

  /**
   * Refresh access token — implements refresh token rotation with family-level
   * reuse detection.
   *
   * Happy path:
   *  1. Verify the JWT signature & expiry.
   *  2. Look up the matching session row by hashed token.
   *  3. If the session is already revoked → the token was replayed after rotation.
   *     Revoke the entire family and throw 401.
   *  4. Mark the current session as revoked + set replacedBy.
   *  5. Issue a brand-new access token AND a brand-new refresh token.
   *  6. Store the new session in the same family.
   *  7. Return both tokens.
   */
  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    const { refresh_token } = refreshTokenDto;

    // Step 1 — verify JWT signature & expiry
    let payload: { sub: string; email: string; role: string; jti?: string };
    try {
      payload = await this.jwtService.verifyAsync(refresh_token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super_secret_refresh_jwt_key',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Step 2 — find the matching session by scanning hashed tokens for this user
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Fetch all non-expired sessions for this user so we can bcrypt-compare
    const candidateSessions = await this.sessionRepository.find({
      where: { user: { id: user.id } },
      relations: ['user'],
    });

    let matchedSession: Session | null = null;
    for (const session of candidateSessions) {
      if (await bcrypt.compare(refresh_token, session.refreshToken)) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      // Token is cryptographically valid but not in the DB — treat as stolen
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Step 3 — reuse detection: token was already consumed
    if (matchedSession.isRevoked) {
      await this.revokeFamilyAndAlert(matchedSession.familyId, user, refresh_token);
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions have been revoked for your security.',
      );
    }

    // Step 4 — atomically revoke the current session
    const newSessionId = uuidv4(); // reserve the ID so we can set replacedBy
    await this.sessionRepository.update(matchedSession.id, {
      isRevoked: true,
      replacedBy: newSessionId,
      lastUsedAt: new Date(),
    });

    // Step 5 — generate new token pair
    const jwtPayload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        expiresIn: this.accessTokenExpiry,
        secret:
          this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key',
      }),
      this.jwtService.signAsync(jwtPayload, {
        expiresIn: this.refreshTokenExpiry,
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super_secret_refresh_jwt_key',
      }),
    ]);

    // Step 6 — store the new session in the SAME family
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, this.saltRounds);
    const newSession = this.sessionRepository.create({
      id: newSessionId,
      user,
      refreshToken: hashedNewRefreshToken,
      familyId: matchedSession.familyId,
      isRevoked: false,
      replacedBy: null,
      userAgent: matchedSession.userAgent,
      ipAddress: matchedSession.ipAddress,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + this.refreshTokenExpiryMs),
    });
    await this.sessionRepository.save(newSession);

    this.logger.log(
      `Refresh token rotated for user ${user.id} (family ${matchedSession.familyId})`,
      'AuthService',
    );

    // Step 7 — return both tokens
    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
    };
  }

  /**
   * Revoke every session in a token family and write a security-event audit
   * record. Called when a previously consumed (revoked) token is replayed —
   * indicating a stolen token.
   */
  private async revokeFamilyAndAlert(
    familyId: string,
    user: User,
    replayedToken: string,
  ): Promise<void> {
    // Mark all sessions in the family as revoked
    await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isRevoked: true })
      .where('family_id = :familyId', { familyId })
      .execute();

    const metadata: Record<string, unknown> = {
      familyId,
      userId: user.id,
      email: user.email,
      detectedAt: new Date().toISOString(),
    };

    // Write audit log entry
    const securityEvent = this.securityEventRepository.create({
      userId: user.id,
      type: SecurityEventType.REFRESH_TOKEN_REUSE,
      message: `Refresh token reuse detected for family ${familyId}. All sessions in the family have been revoked.`,
      metadata,
    });
    await this.securityEventRepository.save(securityEvent);

    this.logger.warn(
      JSON.stringify({
        event: SecurityEventType.REFRESH_TOKEN_REUSE,
        ...metadata,
      }),
      'AuthService',
    );

    // Alert the user by email (send via mail service if configured, otherwise log)
    await this.sendSecurityAlertEmail(user, familyId);
  }

  /**
   * Sends a security alert email to the user when their token family is revoked.
   * Replace the logger stub with a real mailer (e.g. @nestjs-modules/mailer)
   * once an SMTP / SES transport is wired up.
   */
  private async sendSecurityAlertEmail(user: User, familyId: string): Promise<void> {
    const subject = 'Security Alert: Suspicious Activity Detected on Your Account';
    const body = [
      `Hello ${user.firstName ?? user.email},`,
      '',
      'We detected that a previously used refresh token was submitted to your account.',
      'This may indicate that your session token has been stolen.',
      '',
      'As a precaution, all active sessions associated with this login have been revoked.',
      'Please log in again and change your password if you did not initiate this request.',
      '',
      `Event reference: ${familyId}`,
      `Time: ${new Date().toISOString()}`,
      '',
      '— Harvest Finance Security Team',
    ].join('\n');

    // TODO: replace with real mail transport (e.g. nodemailer / @nestjs-modules/mailer)
    this.logger.error(
      `[EMAIL ALERT] To: ${user.email} | Subject: ${subject}\n${body}`,
      'AuthService',
    );
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
   * Generate access and refresh tokens and persist a new session row.
   * Each call starts a brand-new token family (used on login/register/OAuth).
   */
  private async generateTokens(
    user: User,
    context?: { userAgent?: string; ipAddress?: string },
  ): Promise<{
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

    // Store hashed refresh token with a new family ID
    const hashedRefreshToken = await bcrypt.hash(refreshToken, this.saltRounds);
    const session = this.sessionRepository.create({
      user,
      refreshToken: hashedRefreshToken,
      familyId: uuidv4(),   // new family for every fresh login
      isRevoked: false,
      replacedBy: null,
      userAgent: context?.userAgent ?? 'Unknown',
      ipAddress: context?.ipAddress ?? 'Unknown',
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + this.refreshTokenExpiryMs),
    });
    await this.sessionRepository.save(session);

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
      wallet_type: user.walletType,
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

  async validatePasswordStrength(password: string): Promise<void> {
    const result = zxcvbn(password);
    if (result.score < 3 || password.length < 12) {
      throw new BadRequestException('Password is too weak. Must be at least 12 characters.');
    }
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const text = await response.text();
      if (text.includes(suffix)) {
        throw new BadRequestException('Password has been found in a data breach. Please choose another.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn('Failed to check HIBP API', 'AuthService');
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: this.configService.get('JWT_SECRET') || 'super_secret_jwt_key' });
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (user) {
        user.emailVerifiedAt = new Date();
        await this.userRepository.save(user);
        return { success: true };
      }
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }
    throw new BadRequestException('User not found');
  }

  async resendVerification(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const token = await this.jwtService.signAsync({ sub: user.id }, { secret: this.configService.get('JWT_SECRET') || 'super_secret_jwt_key', expiresIn: '24h' });
    this.logger.log(`Resending verification to ${user.email}: ${token}`, 'AuthService');
    return { success: true };
  }

  async getSessions(userId: string, page: number, limit: number) {
    const [items, total] = await this.sessionRepository.findAndCount({
      where: { user: { id: userId } },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.sessionRepository.delete({ id: sessionId, user: { id: userId } });
    return { success: true };
  }

  async revokeAllSessions(userId: string, currentSessionId?: string) {
    const query = this.sessionRepository.createQueryBuilder().delete().where('user_id = :userId', { userId });
    if (currentSessionId) {
      query.andWhere('id != :currentSessionId', { currentSessionId });
    }
    await query.execute();
    return { success: true };
  }
}
