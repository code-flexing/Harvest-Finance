import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { User, UserRole } from '../database/entities/user.entity';
import { UserOAuthLink } from '../database/entities/user-oauth-link.entity';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
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
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_SECRET: 'test_jwt_secret',
          JWT_REFRESH_SECRET: 'test_refresh_secret',
          JWT_EXPIRES_IN: '1h',
          JWT_REFRESH_EXPIRES_IN: '7d',
          MAX_LOGIN_ATTEMPTS: 5,
          LOCKOUT_WINDOW_MINUTES: 15,
          LOCKOUT_DURATION_MINUTES: 30,
        };
        return key in config ? config[key] : defaultValue;
      }),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();

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
        {
          provide: getRepositoryToken(UserOAuthLink),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      role: UserRole.FARMER,
      full_name: 'John Doe',
      phone_number: '+1234567890',
      stellar_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully register a new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...mockUser,
        ...registerDto,
      });
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        ...registerDto,
        id: 'new-id',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toHaveProperty('email', registerDto.email);
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('should successfully login and return tokens', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
      const userWithPassword = { ...mockUser, password: hashedPassword };
      mockUserRepository.findOne.mockResolvedValue(userWithPassword);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toHaveProperty('email', mockUser.email);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const refreshTokenDto = {
      refresh_token: 'valid_refresh_token',
    };

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should successfully refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new_access_token');

      const result = await service.refresh(refreshTokenDto);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('new_access_token');
      expect(result).toHaveProperty('token_type', 'Bearer');
    });
  });

  describe('logout', () => {
    it('should blacklist the token', async () => {
      const token = 'valid_token';
      mockJwtService.verifyAsync.mockResolvedValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await service.logout(token);

      expect(result).toHaveProperty('success', true);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should always return success to prevent email enumeration', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('success', true);
    });

    it('should generate reset token for existing user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('success', true);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'valid_token',
      new_password: 'NewSecurePass123!',
    };

    it('should throw BadRequestException when no active (non-expired) tokens exist', async () => {
      // find() returns empty array — no users with resetPasswordExpires > now
      mockUserRepository.find.mockResolvedValue([]);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token hash does not match', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'some_other_hashed_token',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };
      mockUserRepository.find.mockResolvedValue([userWithToken]);
      // bcrypt.compare returns false — token does not match stored hash
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token has null resetPasswordToken', async () => {
      const userWithNullToken = {
        ...mockUser,
        resetPasswordToken: null,
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };
      mockUserRepository.find.mockResolvedValue([userWithNullToken]);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully reset password with valid non-expired token', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'hashed_valid_token',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };
      // Only non-expired users are returned by the MoreThan query
      mockUserRepository.find.mockResolvedValue([userWithToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'Password reset successfully');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          password: 'new_hashed_password',
          resetPasswordToken: null,
          resetPasswordExpires: null,
        }),
      );
    });

    it('should reject expired tokens (expired users never appear in find results)', async () => {
      // The MoreThan(new Date()) query excludes expired tokens at the DB level.
      // Simulate: only users with expiry > now are returned; expired user is absent.
      mockUserRepository.find.mockResolvedValue([]);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      // update must NOT be called — password must not change
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('account lockout', () => {
    const loginDto = { email: 'test@example.com', password: 'WrongPass!' };

    it('should throw UnauthorizedException when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 20 * 60 * 1000), // 20 min from now
      };
      mockUserRepository.findOne.mockResolvedValue(lockedUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      const err = await service.login(loginDto).catch((e) => e);
      expect(err.message).toMatch(/locked/i);
    });

    it('should allow login when lock has expired', async () => {
      const expiredLockUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() - 1000), // 1 second in the past
        password: 'hashed',
      };
      mockUserRepository.findOne.mockResolvedValue(expiredLockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockCacheManager.del.mockResolvedValue(undefined);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      const result = await service.login(loginDto);
      expect(result).toHaveProperty('access_token');
    });

    it('should increment Redis counter on failed password', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockCacheManager.get.mockResolvedValue(1); // existing count = 1
      mockCacheManager.set.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `lockout:attempts:${mockUser.id}`,
        2,
        expect.any(Number),
      );
    });

    it('should lock account and write lockedUntil to DB when threshold reached', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockCacheManager.get.mockResolvedValue(4); // 4 existing → 5th attempt triggers lock
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lockedUntil: expect.any(Date) }),
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `lockout:attempts:${mockUser.id}`,
      );
    });

    it('should reset counter and clear lockedUntil on successful login', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, password: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token')
        .mockResolvedValueOnce('refresh_token');

      await service.login(loginDto);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `lockout:attempts:${mockUser.id}`,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lockedUntil: null }),
      );
    });
  });
});
