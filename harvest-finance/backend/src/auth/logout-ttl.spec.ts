import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';

/**
 * Auth Service Logout TTL Calculation Tests
 *
 * These tests verify that the logout method correctly:
 * - Calculates TTL (time-to-live) in seconds for active tokens
 * - Sets TTL to 0 for expired or already-expired tokens
 * - Properly converts between Unix timestamps (seconds) and milliseconds
 * - Handles edge cases around token expiry boundaries
 */
describe('AuthService - Logout TTL Calculation', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockCacheManager: any;
  let mockLogger: any;

  beforeEach(async () => {
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

  describe('TTL Calculation for Active Tokens', () => {
    it('should calculate correct TTL for token expiring in 1 hour', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const expiresInSeconds = 3600; // 1 hour

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + expiresInSeconds,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('valid_token');

      expect(result.success).toBe(true);
      expect(mockCacheManager.set).toHaveBeenCalled();

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2]; // Third parameter is TTL in seconds

      // TTL should be approximately 3600 seconds (allow 1-second variance due to execution time)
      expect(ttl).toBeGreaterThanOrEqual(3599);
      expect(ttl).toBeLessThanOrEqual(3600);

      jest.useRealTimers();
    });

    it('should calculate correct TTL for token expiring in 30 minutes', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const expiresInSeconds = 1800; // 30 minutes

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + expiresInSeconds,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('valid_token');

      expect(result.success).toBe(true);

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      expect(ttl).toBeGreaterThanOrEqual(1799);
      expect(ttl).toBeLessThanOrEqual(1800);

      jest.useRealTimers();
    });

    it('should calculate correct TTL for token expiring in 7 days', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const expiresInSeconds = 604800; // 7 days

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + expiresInSeconds,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('valid_token');

      expect(result.success).toBe(true);

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      expect(ttl).toBeGreaterThanOrEqual(604799);
      expect(ttl).toBeLessThanOrEqual(604800);

      jest.useRealTimers();
    });

    it('should calculate TTL with high precision (seconds accuracy)', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Test with specific seconds value
      const expiryTimestamp = now + 12345;

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: expiryTimestamp,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('valid_token');

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      // Should be within 1 second due to execution time
      expect(ttl).toBeGreaterThanOrEqual(12344);
      expect(ttl).toBeLessThanOrEqual(12345);

      jest.useRealTimers();
    });
  });

  describe('TTL Edge Cases', () => {
    it('should handle token expiring in exactly 1 second', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + 1,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('token_about_to_expire');

      expect(result.success).toBe(true);

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      expect(ttl).toBeLessThanOrEqual(1);
      expect(ttl).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });

    it('should set TTL to 0 for already-expired token', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Token expired 1 hour ago
      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now - 3600,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('expired_token');

      expect(result.success).toBe(true);

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      // TTL should be 0 (Math.max(0, ...))
      expect(ttl).toBe(0);

      jest.useRealTimers();
    });

    it('should set TTL to 0 for token expired significantly in the past', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Token expired 30 days ago
      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now - 30 * 86400,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('long_expired_token');

      expect(result.success).toBe(true);

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      expect(ttl).toBe(0);

      jest.useRealTimers();
    });

    it('should not attempt to blacklist token with zero TTL', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now - 1000, // Expired
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('expired_token');

      expect(result.success).toBe(true);

      // Cache manager should NOT be called if ttl <= 0
      // (based on the code: if (ttl > 0) { cacheManager.set(...) })
      expect(mockCacheManager.set).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Timestamp Unit Conversion', () => {
    it('should correctly convert exp timestamp from seconds to milliseconds', async () => {
      jest.useFakeTimers();
      const nowSeconds = Math.floor(Date.now() / 1000);
      const nowMs = Date.now();

      // Verify the conversion is correct
      const expSeconds = nowSeconds + 3600;
      const expMs = expSeconds * 1000;

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: expSeconds,
        sub: 'user-123',
        email: 'test@example.com',
      });

      await service.logout('token');

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      // Verify: (expMs - nowMs) / 1000 = ttl
      const expectedTtl = Math.max(0, Math.floor((expMs - nowMs) / 1000));

      // Should match within 1 second
      expect(Math.abs(ttl - expectedTtl)).toBeLessThanOrEqual(1);

      jest.useRealTimers();
    });

    it('should handle year 2038 problem edge case (large Unix timestamps)', async () => {
      jest.useFakeTimers();

      // January 19, 2038, 3:14:07 UTC (year 2038 problem boundary)
      const year2038Boundary = 2147483647;

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: year2038Boundary + 100, // Slightly past the boundary
        sub: 'user-123',
        email: 'test@example.com',
      });

      // Should not crash or overflow
      const result = await service.logout('future_token');

      expect(result.success).toBe(true);

      // TTL should be calculated correctly despite large timestamp
      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      expect(typeof ttl).toBe('number');
      expect(ttl).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });
  });

  describe('Blacklist Key Construction', () => {
    it('should use correct key format for blacklist cache entry', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const testToken = 'test_token_xyz123';

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + 3600,
        sub: 'user-123',
        email: 'test@example.com',
      });

      await service.logout(testToken);

      const setCall = mockCacheManager.set.mock.calls[0];
      const cacheKey = setCall[0];
      const cacheValue = setCall[1];

      // Key should be in format: "blacklist:{token}"
      expect(cacheKey).toBe(`blacklist:${testToken}`);
      expect(cacheValue).toBe(true);

      jest.useRealTimers();
    });

    it('should handle tokens with special characters in blacklist key', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      // Token with dots, hyphens (typical JWT format)
      const jwtToken = 'header.payload.signature';

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + 3600,
        sub: 'user-123',
        email: 'test@example.com',
      });

      await service.logout(jwtToken);

      const setCall = mockCacheManager.set.mock.calls[0];
      const cacheKey = setCall[0];

      expect(cacheKey).toBe(`blacklist:${jwtToken}`);

      jest.useRealTimers();
    });
  });

  describe('Error Handling for Invalid Tokens', () => {
    it('should return success even if token verification fails', async () => {
      jest.useFakeTimers();

      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Invalid token'),
      );

      const result = await service.logout('invalid_token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');

      // Cache should not be called if verify fails
      expect(mockCacheManager.set).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should return success for malformed token', async () => {
      jest.useFakeTimers();

      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Malformed token'),
      );

      const result = await service.logout('malformed...token');

      expect(result.success).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Time Advancement During Logout', () => {
    it('should calculate TTL at the moment of logout call', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = now + 5000; // 5000 seconds from now

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: expiryTime,
        sub: 'user-123',
        email: 'test@example.com',
      });

      // Call logout at current time
      const result = await service.logout('token');

      // Check TTL at this moment
      const setCall1 = mockCacheManager.set.mock.calls[0];
      const ttl1 = setCall1[2];

      // Reset mocks
      mockCacheManager.set.mockClear();
      mockJwtService.verifyAsync.mockClear();

      // Advance time by 100 seconds
      jest.advanceTimersByTime(100000);

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: expiryTime,
        sub: 'user-123',
        email: 'test@example.com',
      });

      // Call logout again
      await service.logout('token');

      const setCall2 = mockCacheManager.set.mock.calls[0];
      const ttl2 = setCall2[2];

      // TTL should be approximately 100 seconds less
      const difference = ttl1 - ttl2;
      expect(difference).toBeGreaterThanOrEqual(99);
      expect(difference).toBeLessThanOrEqual(101);

      jest.useRealTimers();
    });
  });

  describe('Math.max(0, ...) Floor Operation', () => {
    it('should floor TTL value to integer seconds', async () => {
      jest.useFakeTimers();
      const now = Date.now();

      // Create a scenario where there's a fractional second component
      mockJwtService.verifyAsync.mockResolvedValue({
        // exp in seconds (integer)
        exp: Math.floor(now / 1000) + 3600,
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('token');

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      // TTL should be an integer (due to Math.floor)
      expect(Number.isInteger(ttl)).toBe(true);

      jest.useRealTimers();
    });

    it('should not produce negative TTL due to Math.max(0, ...)', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Create a scenario where calculated TTL would be negative
      // (token already expired)
      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now - 12345, // Expired 12345 seconds ago
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await service.logout('token');

      const setCall = mockCacheManager.set.mock.calls[0];
      const ttl = setCall[2];

      // TTL should never be negative
      expect(ttl).toBe(0);
      expect(ttl).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });
  });
});
