import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthResponseDto,
  LogoutResponseDto,
  TokenResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import {
  StellarChallengeDto,
  StellarVerifyDto,
  StellarAuthResponseDto,
  StellarChallengeResponseDto,
} from './dto/stellar-auth.dto';
import { StellarStrategy } from './strategies/stellar.strategy';

/**
 * Authentication Controller
 * 
 * Throttling Tiers Overview:
 * - short: Strict rate limits for high-risk or resource-intensive operations (e.g., login, password reset). Protects against brute-force attacks.
 * - medium: Moderate limits for standard operations (e.g., token refresh, generating challenges). Balances usability with spam prevention.
 * - long: Generous limits for low-risk, infrequent operations (e.g., registration, public data fetching). Prevents general abuse over longer periods.
 */
@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly stellarStrategy: StellarStrategy,
  ) {}

  /**
   * Register a new user
   *
   * Uses long tier: Registration is an infrequent operation, so a longer 
   * window prevents spam while allowing normal user onboarding.
   */
  @Post('register')
  @Throttle({ long: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Login user
   *
   * Uses stricter long tier limits: Login is a high-value target for 
   * brute-force attacks and requires tighter throttling.
   */
  @Post('login')
  @Throttle({ long: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Refresh access token
   *
   * Uses default (medium) tier: Token refresh is a standard operation
   * that balances usability with spam prevention.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  /**
   * Logout user
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: LogoutResponseDto,
  })
  async logout(@Req() req: Request): Promise<LogoutResponseDto> {
    const token = (req as any).headers.authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  /**
   * Forgot password
   *
   * Uses `@RateLimit` (backed by `RateLimitGuard`) instead of the global
   * throttler because password-reset is a high-value target for abuse and
   * benefits from a stricter, per-user/IP window with a clear error message.
   */
  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    limit: 5,
    ttl: 3600,
    message: 'Too many password reset requests. Please try again in 1 hour.',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent (if email exists)',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * Reset password
   *
   * Uses `@RateLimit` to strictly cap token-consumption attempts and prevent
   * brute-force attacks against short-lived reset tokens.
   */
  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({
    limit: 5,
    ttl: 3600,
    message: 'Too many password reset attempts. Please try again in 1 hour.',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * Generate Stellar challenge for authentication
   *
   * Uses default tier: Moderate limits for standard operations to
   * prevent challenge spam while supporting regular login flows.
   */
  @Post('stellar/challenge')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate Stellar authentication challenge' })
  @ApiBody({ type: StellarChallengeDto })
  @ApiResponse({
    status: 200,
    description: 'Challenge generated successfully',
    type: StellarChallengeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid Stellar public key',
  })
  async generateStellarChallenge(
    @Body() challengeDto: StellarChallengeDto,
  ): Promise<StellarChallengeResponseDto> {
    const transaction = await this.stellarStrategy.generateChallenge(
      challengeDto.public_key,
    );

    return {
      server_public_key: this.stellarStrategy.getServerPublicKey(),
      transaction,
      network_passphrase: this.stellarStrategy['networkPassphrase'],
    };
  }

  /**
   * Verify Stellar challenge and authenticate user
   *
   * Uses stricter default limits: Verification involves cryptographic checks
   * and token generation, requiring tighter throttling against abuse.
   */
  @Post('stellar/verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Stellar challenge and authenticate' })
  @ApiBody({ type: StellarVerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: StellarAuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid challenge or signature',
  })
  async verifyStellarAuth(
    @Body() verifyDto: StellarVerifyDto,
  ): Promise<StellarAuthResponseDto> {
    const user = await this.stellarStrategy.validate(verifyDto.transaction);
    const tokens = await this.authService['generateTokens'](user);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        stellar_address: user.stellarAddress ?? '',
        role: user.role,
        full_name:
          [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
      },
    };
  }
}
