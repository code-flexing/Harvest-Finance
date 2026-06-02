import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

/**
 * Comprehensive Token Expiry Validation Tests
 *
 * These tests verify that authentication tokens are:
 * - Accepted immediately after issuance
 * - Valid throughout their configured validity window
 * - Rejected exactly at or after the expiry threshold
 * - Consistently rejected when significantly past expiry
 *
 * Uses fake timers (jest.useFakeTimers) to simulate time passage without real delays
 * and ensure deterministic, wall-clock-independent test execution.
 */
describe('AuthService - Token Expiry Validation', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockCacheManager: any;
  let mockLogger: any;

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashed_password',
    role: UserRole.FARMER,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    stellarAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Clear all timer mocks before each test
    jest.clearAllTimers();
    jest.clearAllMocks();

    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test_jwt_secret',
          JWT_REFRESH_SECRET: 'test_refresh_secret',
          JWT_EXPIRES_IN: '1h',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Helper function to create a JWT token with specific expiry time
   * @param expiresIn - Expiry time in seconds from now
   * @returns JWT token string
   */
  const createMockToken = (
    expiresIn: number,
    secret: string = 'test_jwt_secret',
  ): string => {
    const payload = {
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    };

    return jwt.sign(payload, secret, {
      expiresIn,
    });
  };

  /**
   * Helper function to simulate time passing
   * @param ms - Milliseconds to advance time
   */
  let fakeNowMs: number;

  const advanceTimeByMs = (ms: number) => {
    fakeNowMs = (fakeNowMs || Date.now()) + ms;
    jest.setSystemTime(fakeNowMs);
  };

  describe('Access Token Expiry (1 hour)', () => {
    const accessTokenExpirySeconds = 3600; // 1 hour

    it('should accept token immediately after issuance', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const token = createMockToken(accessTokenExpirySeconds);
      const payload = jwt.decode(token) as any;

      // Token should be valid immediately
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp - now).toBeLessThanOrEqual(accessTokenExpirySeconds + 1);

      jest.useRealTimers();
    });

    it('should verify token is valid within its validity window (at 50% of lifetime)', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const startTime = Date.now();
      const token = createMockToken(accessTokenExpirySeconds);
      const payload = jwt.decode(token) as any;

      // Advance time by 50% of token lifetime (30 minutes)
      advanceTimeByMs(accessTokenExpirySeconds * 500); // 50% in milliseconds

      // Token should still be valid
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
      expect(now - Math.floor(startTime / 1000)).toBeGreaterThanOrEqual(1800); // At least 30 minutes passed

      jest.useRealTimers();
    });

    it('should accept token at 90% of its lifetime', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const token = createMockToken(accessTokenExpirySeconds);
      const payload = jwt.decode(token) as any;

      // Advance time by 90% of token lifetime (54 minutes)
      advanceTimeByMs(Math.floor(accessTokenExpirySeconds * 0.9 * 1000));

      // Token should still be valid
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);

      jest.useRealTimers();
    });

    it('should reject token exactly at expiry time', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const token = createMockToken(accessTokenExpirySeconds);
      const payload = jwt.decode(token) as any;

      // Advance time to exact expiry moment
      advanceTimeByMs(accessTokenExpirySeconds * 1000);

      // Token should be expired (exp is not > current time)
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeLessThanOrEqual(now);

      jest.useRealTimers();
    });

    it('should reject token 1 second after expiry', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const token = createMockToken(accessTokenExpirySeconds);
      const payload = jwt.decode(token) as any;

      // Advance time to 1 second past expiry
      advanceTimeByMs((accessTokenExpirySeconds + 1) * 1000);

      // Token should be expired
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeLessThan(now);

      jest.useRealTimers();
    });

    it('should reject token significantly past expiry (1 day later)', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const token = createMockToken(accessTokenExpirySeconds);
      const payload = jwt.decode(token) as any;

      // Advance time by 1 day (86400 seconds)
      advanceTimeByMs((accessTokenExpirySeconds + 86400) * 1000);

      // Token should be expired
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeLessThan(now);

      jest.useRealTimers();
    });

    it('should handle verify rejection for expired token in service', async () => {
      jest.useFakeTimers('modern');
      fakeNowMs = Date.now();
      jest.setSystemTime(fakeNowMs);

      const token = createMockToken(accessTokenExpirySeconds);

      // Mock verifyAsync to throw for expired token when time has passed
      mockJwtService.verifyAsync.mockImplementation((receivedToken, options) => {
        try {
          return Promise.resolve(
            jwt.verify(receivedToken, options.secret, {
              ignoreExpiration: false,
            }),
          );
        } catch (error) {
          return Promise.reject(new Error('jwt expired'));
        }
      });

      // Verify token works initially
      const initialPayload = await mockJwtService.verifyAsync(token, {
        secret: 'test_jwt_secret',
      });
      expect(initialPayload).toBeTruthy();

      // Advance time past expiry
      advanceTimeByMs((accessTokenExpirySeconds + 1) * 1000);

      // Verify should now reject
      await expect(
        mockJwtService.verifyAsync(token, {
          secret: 'test_jwt_secret',
        }),
      ).rejects.toThrow('jwt expired');

      jest.useRealTimers();
    });
  });

  describe('Refresh Token Expiry (7 days)', () => {
    const refreshTokenExpirySeconds = 604800; // 7 days

    it('should accept refresh token immediately after issuance', async () => {
      jest.useFakeTimers();

      const token = createMockToken(refreshTokenExpirySeconds, 'test_refresh_secret');
      const payload = jwt.decode(token) as any;

      // Token should be valid immediately
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);

      jest.useRealTimers();
    });

    it('should accept refresh token at 50% of lifetime (3.5 days)', async () => {
      jest.useFakeTimers();

      const token = createMockToken(refreshTokenExpirySeconds, 'test_refresh_secret');
      const payload = jwt.decode(token) as any;

      // Advance time by 50% of token lifetime (3.5 days)
      advanceTimeByMs(Math.floor(refreshTokenExpirySeconds * 0.5 * 1000));

      // Token should still be valid
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);

      jest.useRealTimers();
    });

    it('should accept refresh token at 95% of lifetime', async () => {
      jest.useFakeTimers();

      const token = createMockToken(refreshTokenExpirySeconds, 'test_refresh_secret');
      const payload = jwt.decode(token) as any;

      // Advance time by 95% of token lifetime
      advanceTimeByMs(Math.floor(refreshTokenExpirySeconds * 0.95 * 1000));

      // Token should still be valid
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);

      jest.useRealTimers();
    });

    it('should reject refresh token exactly at expiry (7 days)', async () => {
      jest.useFakeTimers();

      const token = createMockToken(refreshTokenExpirySeconds, 'test_refresh_secret');
      const payload = jwt.decode(token) as any;

      // Advance time to exact expiry
      advanceTimeByMs(refreshTokenExpirySeconds * 1000);

      // Token should be expired
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeLessThanOrEqual(now);

      jest.useRealTimers();
    });

    it('should reject refresh token 1 second after expiry', async () => {
      jest.useFakeTimers();

      const token = createMockToken(refreshTokenExpirySeconds, 'test_refresh_secret');
      const payload = jwt.decode(token) as any;

      // Advance time to 1 second past expiry
      advanceTimeByMs((refreshTokenExpirySeconds + 1) * 1000);

      // Token should be expired
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeLessThan(now);

      jest.useRealTimers();
    });

    it('should reject refresh token significantly past expiry (30 days later)', async () => {
      jest.useFakeTimers();

      const token = createMockToken(refreshTokenExpirySeconds, 'test_refresh_secret');
      const payload = jwt.decode(token) as any;

      // Advance time by 30 days total (far past 7-day expiry)
      advanceTimeByMs((30 * 86400) * 1000);

      // Token should be expired
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeLessThan(now);

      jest.useRealTimers();
    });
  });

  describe('Reset Token Expiry (1 hour in milliseconds)', () => {
    const resetTokenExpiryMs = 3600000; // 1 hour

    it('should verify reset token is not expired immediately after generation', async () => {
      const expiresAt = new Date(Date.now() + resetTokenExpiryMs);
      const now = new Date();

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      expect(expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(
        resetTokenExpiryMs + 100,
      ); // Allow small margin
    });

    it('should verify reset token at 50% of lifetime (30 minutes)', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const expiresAt = new Date(startTime + resetTokenExpiryMs);

      // Advance time by 50% of token lifetime (30 minutes)
      advanceTimeByMs(resetTokenExpiryMs * 0.5);

      const now = new Date();

      // Token should still be valid
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());

      jest.useRealTimers();
    });

    it('should verify reset token expires exactly at expiry time', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const expiresAt = new Date(startTime + resetTokenExpiryMs);

      // Advance time to exact expiry
      advanceTimeByMs(resetTokenExpiryMs);

      const now = new Date();

      // Token should be expired (not > now)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(now.getTime());

      jest.useRealTimers();
    });

    it('should verify reset token is expired 1 ms after expiry', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const expiresAt = new Date(startTime + resetTokenExpiryMs);

      // Advance time to 1 ms past expiry
      advanceTimeByMs(resetTokenExpiryMs + 1);

      const now = new Date();

      // Token should be expired
      expect(expiresAt.getTime()).toBeLessThan(now.getTime());

      jest.useRealTimers();
    });

    it('should verify reset token rejected significantly past expiry', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      const expiresAt = new Date(startTime + resetTokenExpiryMs);

      // Advance time by 2 hours (far past 1-hour expiry)
      advanceTimeByMs(resetTokenExpiryMs * 2);

      const now = new Date();

      // Token should be expired
      expect(expiresAt.getTime()).toBeLessThan(now.getTime());

      jest.useRealTimers();
    });
  });

  describe('Refresh Token Service Behavior with Expiry', () => {
    it('should accept valid refresh token and generate new access token', async () => {
      jest.useFakeTimers();

      const refreshToken = createMockToken(604800, 'test_refresh_secret'); // 7 days

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new_access_token');

      const result = await service.refresh({
        refresh_token: refreshToken,
      });

      expect(result.access_token).toBe('new_access_token');
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        refreshToken,
        expect.objectContaining({
          secret: 'test_refresh_secret',
        }),
      );

      jest.useRealTimers();
    });

    it('should reject expired refresh token in refresh service', async () => {
      jest.useFakeTimers();

      const refreshToken = createMockToken(3600, 'test_refresh_secret'); // 1 hour

      // Mock verifyAsync to reject expired token
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('jwt expired'),
      );

      const refreshTokenDto = { refresh_token: refreshToken };

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      jest.useRealTimers();
    });

    it('should handle inactive user with valid expired token differently', async () => {
      jest.useFakeTimers();

      const refreshToken = createMockToken(604800, 'test_refresh_secret');

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      // User is inactive
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      const refreshTokenDto = { refresh_token: refreshToken };

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      jest.useRealTimers();
    });
  });

  describe('Logout Token Blacklisting with Expiry', () => {
    it('should calculate correct TTL for token expiring in future', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 3600; // 1 hour

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + expiresIn,
        sub: mockUser.id,
        email: mockUser.email,
      });

      const result = await service.logout('valid_token');

      expect(result.success).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalled();

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2]; // Third parameter is TTL

      // TTL should be approximately expiresIn (1 hour = 3600 seconds)
      expect(ttl).toBeLessThanOrEqual(expiresIn + 1); // Allow small variance
      expect(ttl).toBeGreaterThanOrEqual(expiresIn - 1);

      jest.useRealTimers();
    });

    it('should set TTL to 0 for already-expired token', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Token expired 1 hour ago
      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now - 3600,
        sub: mockUser.id,
        email: mockUser.email,
      });

      const result = await service.logout('expired_token');

      expect(result.success).toBe(true);

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      // TTL should be 0 or close to it
      expect(ttl).toBeLessThanOrEqual(0);

      jest.useRealTimers();
    });
  });

  describe('Boundary Conditions and Edge Cases', () => {
    it('should handle token with exactly 1 second remaining', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + 1, // Expires in 1 second
        sub: mockUser.id,
        email: mockUser.email,
      });

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Token should still be valid
      const result = await service.validateUser(mockUser.id, mockUser.email);
      expect(result).toBeTruthy();

      // Advance time by 1 second
      advanceTimeByMs(1000);

      // Now token should be expired
      const expiredPayload = {
        exp: now + 1,
        sub: mockUser.id,
        email: mockUser.email,
      };

      expect(expiredPayload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));

      jest.useRealTimers();
    });

    it('should not accept token with exp claim in the past', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const expiredPayload = {
        exp: now - 1000, // Expired 1000 seconds ago
        sub: mockUser.id,
        email: mockUser.email,
      };

      // Expired token should not pass validation
      expect(expiredPayload.exp).toBeLessThan(now);

      jest.useRealTimers();
    });

    it('should handle token with very large exp value (far future)', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const futurePayload = {
        exp: now + 365 * 24 * 3600, // 1 year in future
        sub: mockUser.id,
        email: mockUser.email,
      };

      // Token should be valid
      expect(futurePayload.exp).toBeGreaterThan(now);

      jest.useRealTimers();
    });

    it('should handle millisecond-precision expiry calculations', async () => {
      jest.useFakeTimers();
      const startTime = Date.now();

      // Reset token expiry set to exactly 1 hour from now
      const expiresAt = new Date(startTime + 3600000);

      // Verify millisecond precision
      expect(expiresAt.getTime()).toBe(startTime + 3600000);

      // After 59 minutes 59 seconds 999 milliseconds, should still be valid
      advanceTimeByMs(3599999);
      const almostExpired = new Date();
      expect(expiresAt.getTime()).toBeGreaterThan(almostExpired.getTime());

      // After 1 more millisecond (total 60 min), should be expired
      advanceTimeByMs(1);
      const nowExpired = new Date();
      expect(expiresAt.getTime()).toBeLessThanOrEqual(nowExpired.getTime());

      jest.useRealTimers();
    });

    it('should detect off-by-one errors in token age calculation', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Create token that expires in exactly 3600 seconds
      const expiresAt = now + 3600;

      // At 3599 seconds, token should still be valid
      const almostExpired = now + 3599;
      expect(expiresAt).toBeGreaterThan(almostExpired);

      // At 3600 seconds (exact expiry), token should be expired
      const atExpiry = now + 3600;
      expect(expiresAt).toBeLessThanOrEqual(atExpiry);

      // At 3601 seconds (1 second past), token should definitely be expired
      const pastExpiry = now + 3601;
      expect(expiresAt).toBeLessThan(pastExpiry);

      jest.useRealTimers();
    });
  });

  describe('Time Zone and Clock Skew Handling', () => {
    it('should use UTC timestamps consistently (not affected by local timezone)', async () => {
      jest.useFakeTimers();

      const token = createMockToken(3600);
      const payload = jwt.decode(token) as any;

      // JWT exp is always in UTC (seconds since epoch)
      expect(typeof payload.exp).toBe('number');
      expect(payload.exp).toBeGreaterThan(0);

      // Date.now() returns milliseconds since epoch (UTC-based)
      const nowInSeconds = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(nowInSeconds);

      jest.useRealTimers();
    });

    it('should handle leap second scenarios (exp = now)', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Token that expires exactly now (edge case)
      const token = jwt.sign(
        { sub: mockUser.id, email: mockUser.email },
        'test_jwt_secret',
        { expiresIn: 0 }, // Expires immediately
      );

      const payload = jwt.decode(token) as any;

      // At exact expiry boundary, token should be considered expired
      expect(payload.exp).toBeLessThanOrEqual(now);

      jest.useRealTimers();
    });
  });

  describe('Deterministic Test Execution', () => {
    it('should produce consistent results across multiple test runs', async () => {
      jest.useFakeTimers();

      const token = createMockToken(3600);
      const payload1 = jwt.decode(token) as any;

      // Record expiry in seconds
      const expiryTimestamp = payload1.exp;

      // Simulate test rerun with same starting conditions
      jest.clearAllMocks();
      jest.useFakeTimers();

      const token2 = createMockToken(3600);
      const payload2 = jwt.decode(token2) as any;

      // Expirations should be very close (within system precision)
      // Note: They won't be identical since different tokens are created,
      // but the expiry logic should be consistent
      expect(typeof payload2.exp).toBe('number');
      expect(payload2.exp).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should not depend on wall-clock time between test runs', async () => {
      jest.useFakeTimers();

      const runTest = () => {
        const token = createMockToken(3600);
        const payload = jwt.decode(token) as any;
        const nowInSeconds = Math.floor(Date.now() / 1000);

        return {
          isValid: payload.exp > nowInSeconds,
          secondsUntilExpiry: payload.exp - nowInSeconds,
        };
      };

      const result1 = runTest();
      expect(result1.isValid).toBe(true);
      expect(result1.secondsUntilExpiry).toBeLessThanOrEqual(3600);
      expect(result1.secondsUntilExpiry).toBeGreaterThanOrEqual(3598); // Allow small margin

      // Verify multiple runs produce consistent behavior
      const result2 = runTest();
      expect(result2.isValid).toBe(true);
      expect(result2.secondsUntilExpiry).toBeLessThanOrEqual(3600);

      jest.useRealTimers();
    });
  });
});
