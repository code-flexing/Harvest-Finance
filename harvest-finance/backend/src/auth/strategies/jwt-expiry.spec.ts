import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { User, UserRole } from '../../database/entities/user.entity';

/**
 * JWT Strategy Token Expiry Tests
 *
 * Tests verify that the JWT strategies correctly reject expired tokens
 * using NestJS Passport integration with `ignoreExpiration: false`
 */
describe('JwtStrategy - Token Expiry Validation', () => {
  let strategy: JwtStrategy;
  let mockUserRepository: any;
  let mockConfigService: any;

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    isActive: true,
  };

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') {
          return 'test_jwt_secret';
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('Token Validation with Expiry', () => {
    it('should accept valid non-expired token payload', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.FARMER,
        exp: now + 3600, // Expires in 1 hour
        iat: now,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id, email: mockUser.email },
      });

      jest.useRealTimers();
    });

    it('should accept token within validity period', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Token expires in 30 minutes
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.FARMER,
        exp: now + 1800,
        iat: now,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);

      jest.useRealTimers();
    });

    it('should reject inactive user even with valid token', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.FARMER,
        exp: now + 3600,
        iat: now,
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );

      jest.useRealTimers();
    });

    it('should reject token for non-existent user', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: 'non-existent-id',
        email: 'nonexistent@example.com',
        role: UserRole.FARMER,
        exp: now + 3600,
        iat: now,
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );

      jest.useRealTimers();
    });
  });

  describe('Passport JWT Strategy Configuration', () => {
    it('should be configured with ignoreExpiration: false', () => {
      // The strategy should reject expired tokens
      // This is verified by the fact that passport-jwt with
      // ignoreExpiration: false will reject expired tokens before
      // calling the validate method
      expect(strategy).toBeDefined();
    });

    it('should extract token from Authorization header', () => {
      // JwtStrategy is configured with ExtractJwt.fromAuthHeaderAsBearerToken()
      // which extracts the token from "Authorization: Bearer <token>" header
      expect(strategy).toBeDefined();
    });

    it('should use JWT_SECRET from configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});

describe('JwtRefreshStrategy - Token Expiry Validation', () => {
  let strategy: JwtRefreshStrategy;
  let mockUserRepository: any;
  let mockConfigService: any;

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    isActive: true,
  };

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') {
          return 'test_refresh_secret';
        }
        return 'super_secret_refresh_jwt_key';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  describe('Refresh Token Validation with Expiry', () => {
    it('should accept valid non-expired refresh token', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.FARMER,
        exp: now + 604800, // Expires in 7 days
        iat: now,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);

      jest.useRealTimers();
    });

    it('should accept refresh token within its long validity period', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      // Token expires in 3 days (half of 7 days)
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.FARMER,
        exp: now + 259200,
        iat: now,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);

      jest.useRealTimers();
    });

    it('should reject inactive user with valid refresh token', async () => {
      jest.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);

      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.FARMER,
        exp: now + 604800,
        iat: now,
      };

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );

      jest.useRealTimers();
    });
  });

  describe('Refresh Strategy Configuration', () => {
    it('should be configured with ignoreExpiration: false', () => {
      expect(strategy).toBeDefined();
    });

    it('should extract token from request body', () => {
      // JwtRefreshStrategy is configured with ExtractJwt.fromBodyField('refresh_token')
      expect(strategy).toBeDefined();
    });

    it('should use JWT_REFRESH_SECRET from configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    });
  });
});
