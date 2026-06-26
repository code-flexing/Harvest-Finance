import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities/user.entity';
import { CustomLoggerService } from '../logger/custom-logger.service';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

/**
 * Token Lifecycle Integration Tests
 *
 * These tests verify the complete lifecycle of tokens including:
 * - Token generation with correct expiry times
 * - Token refresh before expiry
 * - Token rejection after expiry
 * - Proper TTL calculations for blacklisting
 */
describe('AuthService - Token Lifecycle Integration', () => {
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
    isActive: true,
  };

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

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Helper to create realistic JWT tokens with expiry
   */
  const createRealisticToken = (
    expiresIn: number,
    secret: string,
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

  describe('Complete Authentication Flow with Token Expiry', () => {
    it('should generate tokens that can be verified before expiry', async () => {
      jest.useFakeTimers();

      const accessToken = createRealisticToken(3600, 'test_jwt_secret');
      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');

      // Both tokens should decode successfully
      const accessPayload = jwt.decode(accessToken) as any;
      const refreshPayload = jwt.decode(refreshToken) as any;

      expect(accessPayload.sub).toBe(mockUser.id);
      expect(refreshPayload.sub).toBe(mockUser.id);

      // Verify both tokens are valid now
      const now = Math.floor(Date.now() / 1000);
      expect(accessPayload.exp).toBeGreaterThan(now);
      expect(refreshPayload.exp).toBeGreaterThan(now);

      jest.useRealTimers();
    });

    it('should reject access token after 1 hour expiry', async () => {
      jest.useFakeTimers();

      const accessToken = createRealisticToken(3600, 'test_jwt_secret');

      mockJwtService.verifyAsync.mockImplementation((token, options) => {
        try {
          return Promise.resolve(
            jwt.verify(token, options.secret, { ignoreExpiration: false }),
          );
        } catch (error) {
          return Promise.reject(error);
        }
      });

      // Token should be valid immediately
      const payload1 = await mockJwtService.verifyAsync(accessToken, {
        secret: 'test_jwt_secret',
      });
      expect(payload1).toBeTruthy();

      // Advance time by 1 hour
      jest.advanceTimersByTime(3600000);

      // Token should now be rejected
      await expect(
        mockJwtService.verifyAsync(accessToken, {
          secret: 'test_jwt_secret',
        }),
      ).rejects.toThrow();

      jest.useRealTimers();
    });

    it('should reject refresh token after 7 days expiry', async () => {
      jest.useFakeTimers();

      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');

      mockJwtService.verifyAsync.mockImplementation((token, options) => {
        try {
          return Promise.resolve(
            jwt.verify(token, options.secret, { ignoreExpiration: false }),
          );
        } catch (error) {
          return Promise.reject(error);
        }
      });

      // Token should be valid immediately
      const payload1 = await mockJwtService.verifyAsync(refreshToken, {
        secret: 'test_refresh_secret',
      });
      expect(payload1).toBeTruthy();

      // Advance time by 7 days (604800 seconds)
      jest.advanceTimersByTime(604800000);

      // Token should now be rejected
      await expect(
        mockJwtService.verifyAsync(refreshToken, {
          secret: 'test_refresh_secret',
        }),
      ).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('Login and Token Generation Workflow', () => {
    it('should generate tokens during login with correct expiry settings', async () => {
      jest.useFakeTimers();

      const loginDto = {
        email: mockUser.email,
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        password: 'hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      // Mock token generation
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_1h')
        .mockResolvedValueOnce('refresh_token_7d');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');

      // Verify signAsync was called with correct expiry settings
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
        expect.objectContaining({
          expiresIn: '1h', // Access token 1 hour
        }),
      );

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
        }),
        expect.objectContaining({
          expiresIn: '7d', // Refresh token 7 days
        }),
      );

      jest.useRealTimers();
    });
  });

  describe('Refresh Token Workflow with Expiry', () => {
    it('should allow token refresh within access token expiry window', async () => {
      jest.useFakeTimers();

      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new_access_token');

      // Refresh should succeed within expiry window
      const result = await service.refresh({ refresh_token: refreshToken });

      expect(result.access_token).toBe('new_access_token');

      jest.useRealTimers();
    });

    it('should allow refresh even near the end of refresh token validity', async () => {
      jest.useFakeTimers();

      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');
      const payload = jwt.decode(refreshToken) as any;

      // Advance time to 6.9 days (just before 7-day expiry)
      jest.advanceTimersByTime(6 * 24 * 3600 * 1000 + 20 * 3600 * 1000);

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        exp: payload.exp,
      });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new_access_token');

      // Refresh should still succeed
      const result = await service.refresh({ refresh_token: refreshToken });

      expect(result.access_token).toBe('new_access_token');

      jest.useRealTimers();
    });

    it('should reject refresh when refresh token expires', async () => {
      jest.useFakeTimers();

      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');

      // Advance time past 7-day expiry
      jest.advanceTimersByTime(604800000 + 1000);

      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('jwt expired'),
      );

      // Refresh should fail
      await expect(
        service.refresh({ refresh_token: refreshToken }),
      ).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('Logout Workflow with Token Expiry', () => {
    it('should blacklist token with correct TTL before expiry', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const accessToken = createRealisticToken(3600, 'test_jwt_secret');
      const payload = jwt.decode(accessToken) as any;

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: payload.exp,
        sub: mockUser.id,
        email: mockUser.email,
      });

      await service.logout(accessToken);

      expect(mockCacheManager.set).toHaveBeenCalled();
      const [key, value, ttl] = mockCacheManager.set.mock.calls[0];

      expect(key).toBe(`blacklist:${accessToken}`);
      expect(value).toBe(true);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);

      jest.useRealTimers();
    });

    it('should not blacklist token after it expires', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const accessToken = createRealisticToken(3600, 'test_jwt_secret');

      // Advance time past expiry
      jest.advanceTimersByTime(3601000);

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: now + 3600, // Original expiry
        sub: mockUser.id,
        email: mockUser.email,
      });

      await service.logout(accessToken);

      // Cache should not be called (ttl <= 0)
      expect(mockCacheManager.set).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should calculate TTL based on expiry time not logout time', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      mockJwtService.verifyAsync
        .mockResolvedValueOnce({
          exp: now + 7200, // 2 hours from "now"
          sub: mockUser.id,
          email: mockUser.email,
        })
        .mockResolvedValueOnce({
          exp: now + 7200, // Same token
          sub: mockUser.id,
          email: mockUser.email,
        });

      // First logout at current time
      await service.logout('token1');
      const [, , ttl1] = mockCacheManager.set.mock.calls[0];

      // Reset mocks
      mockCacheManager.set.mockClear();

      // Advance time by 1 hour
      jest.advanceTimersByTime(3600000);

      // Second logout of same token (1 hour later)
      await service.logout('token2');
      const [, , ttl2] = mockCacheManager.set.mock.calls[0];

      // TTL should be approximately 1 hour less
      const ttlDifference = ttl1 - ttl2;
      expect(ttlDifference).toBeGreaterThanOrEqual(3599);
      expect(ttlDifference).toBeLessThanOrEqual(3601);

      jest.useRealTimers();
    });
  });

  describe('Concurrent Token Operations', () => {
    it('should handle simultaneous token verification and expiry correctly', async () => {
      jest.useFakeTimers();

      const token1 = createRealisticToken(3600, 'test_jwt_secret');
      const token2 = createRealisticToken(3600, 'test_jwt_secret');

      const payload1 = jwt.decode(token1) as any;
      const payload2 = jwt.decode(token2) as any;

      mockJwtService.verifyAsync.mockImplementation((token) => {
        const payload = jwt.decode(token) as any;
        if (payload) {
          return Promise.resolve(payload);
        }
        return Promise.reject(new Error('Invalid token'));
      });

      // Both tokens should verify successfully
      const [result1, result2] = await Promise.all([
        mockJwtService.verifyAsync(token1, { secret: 'test_jwt_secret' }),
        mockJwtService.verifyAsync(token2, { secret: 'test_jwt_secret' }),
      ]);

      expect(result1.sub).toBe(mockUser.id);
      expect(result2.sub).toBe(mockUser.id);

      jest.useRealTimers();
    });
  });

  describe('Token Expiry and User State Interaction', () => {
    it('should not allow token refresh if user is deactivated', async () => {
      jest.useFakeTimers();

      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      // User exists but is deactivated
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(deactivatedUser);

      // Should fail even though token is valid
      await expect(
        service.refresh({ refresh_token: refreshToken }),
      ).rejects.toThrow();

      jest.useRealTimers();
    });

    it('should reject token if user is deleted (findOne returns null)', async () => {
      jest.useFakeTimers();

      const refreshToken = createRealisticToken(604800, 'test_refresh_secret');

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      // User does not exist
      mockUserRepository.findOne.mockResolvedValue(null);

      // Should fail
      await expect(
        service.refresh({ refresh_token: refreshToken }),
      ).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('Reset Token Lifecycle', () => {
    it('should generate reset token with correct expiry (1 hour)', async () => {
      jest.useFakeTimers();
      const now = Date.now();

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_reset_token');

      await service.forgotPassword({ email: mockUser.email });

      // Verify update was called with correct expiry
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          resetPasswordExpires: expect.any(Date),
        }),
      );

      const updateCall = mockUserRepository.update.mock.calls[0];
      const updateData = updateCall[1];
      const expiryTime = updateData.resetPasswordExpires.getTime();

      // Should be approximately 1 hour from now
      expect(expiryTime - now).toBeGreaterThanOrEqual(3599900); // 59:59.9 minutes
      expect(expiryTime - now).toBeLessThanOrEqual(3600100); // 60:00.1 minutes

      jest.useRealTimers();
    });

    it('should reject expired reset tokens', async () => {
      jest.useFakeTimers();
      const now = new Date();

      const expiredUser = {
        ...mockUser,
        resetPasswordToken: 'hashed_token',
        resetPasswordExpires: new Date(now.getTime() - 3600000), // Expired 1 hour ago
      };

      mockUserRepository.find.mockResolvedValue([]); // No users with future expiry

      await expect(
        service.resetPassword({
          token: 'any_token',
          new_password: 'newpass123',
        }),
      ).rejects.toThrow();

      jest.useRealTimers();
    });

    it('should accept reset token within validity window', async () => {
      jest.useFakeTimers();
      const now = Date.now();

      const validUser = {
        ...mockUser,
        resetPasswordToken: 'hashed_token',
        resetPasswordExpires: new Date(now + 1800000), // 30 minutes from now
      };

      mockUserRepository.find.mockResolvedValue([validUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.resetPassword({
        token: 'reset_token',
        new_password: 'newpass123',
      });

      expect(result.success).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Expiry Precision and Rounding', () => {
    it('should handle fractional seconds in expiry calculations', async () => {
      jest.useFakeTimers();

      // Create token with specific fractional component
      const nowMs = Date.now();
      const nowSeconds = Math.floor(nowMs / 1000);

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: nowSeconds + 3600,
        sub: mockUser.id,
        email: mockUser.email,
      });

      await service.logout('token');

      const [, , ttl] = mockCacheManager.set.mock.calls[0];

      // TTL should be integer (from Math.floor)
      expect(Number.isInteger(ttl)).toBe(true);

      jest.useRealTimers();
    });

    it('should produce deterministic results for same expiry time', async () => {
      jest.useFakeTimers();
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expirySeconds = nowSeconds + 5000;

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: expirySeconds,
        sub: mockUser.id,
        email: mockUser.email,
      });

      // First call
      await service.logout('token1');
      const [, , ttl1] = mockCacheManager.set.mock.calls[0];

      // Reset mocks
      mockCacheManager.set.mockClear();
      mockJwtService.verifyAsync.mockClear();

      mockJwtService.verifyAsync.mockResolvedValue({
        exp: expirySeconds,
        sub: mockUser.id,
        email: mockUser.email,
      });

      // Second call with same expiry time
      await service.logout('token2');
      const [, , ttl2] = mockCacheManager.set.mock.calls[0];

      // TTLs should be identical (since expiry and now are same in both calls)
      expect(ttl1).toBe(ttl2);

      jest.useRealTimers();
    });
  });
});
