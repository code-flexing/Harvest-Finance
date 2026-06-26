import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CustomLoggerService } from '../logger/custom-logger.service';
import { User, UserRole } from '../database/entities/user.entity';
import { UserOAuthLink } from '../database/entities/user-oauth-link.entity';

describe('AuthService OAuth', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockOAuthLinkRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockCacheManager: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockOAuthLinkRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserOAuthLink),
          useValue: mockOAuthLinkRepository,
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

  describe('validateOrCreateOAuthUser', () => {
    it('should return user if OAuth link already exists', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockLink = { id: 'link-id', user: mockUser };
      mockOAuthLinkRepository.findOne.mockResolvedValue(mockLink);

      const result = await service.validateOrCreateOAuthUser('google', 'google-id', 'test@example.com');
      expect(result).toBe(mockUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-id', expect.any(Object));
    });

    it('should link to existing user if email matches but link does not exist', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      mockOAuthLinkRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOAuthLinkRepository.create.mockReturnValue({ userId: 'user-id', oauthProvider: 'google', oauthId: 'google-id' });
      mockOAuthLinkRepository.save.mockResolvedValue({});

      const result = await service.validateOrCreateOAuthUser('google', 'google-id', 'test@example.com');
      expect(result).toBe(mockUser);
      expect(mockOAuthLinkRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        oauthProvider: 'google',
        oauthId: 'google-id',
      });
      expect(mockOAuthLinkRepository.save).toHaveBeenCalled();
    });

    it('should create a new user and link if email and link do not exist', async () => {
      mockOAuthLinkRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);
      
      const newMockUser = { id: 'new-user-id', email: 'new@example.com' };
      mockUserRepository.create.mockReturnValue(newMockUser);
      mockUserRepository.save.mockResolvedValue(newMockUser);
      
      mockOAuthLinkRepository.create.mockReturnValue({ userId: 'new-user-id', oauthProvider: 'google', oauthId: 'google-id' });
      mockOAuthLinkRepository.save.mockResolvedValue({});

      const result = await service.validateOrCreateOAuthUser('google', 'google-id', 'new@example.com', 'Alice', 'Smith');
      expect(result).toBe(newMockUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
      }));
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockOAuthLinkRepository.create).toHaveBeenCalledWith({
        userId: 'new-user-id',
        oauthProvider: 'google',
        oauthId: 'google-id',
      });
    });
  });

  describe('loginWithOAuth', () => {
    it('should return token payload', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com', role: UserRole.BUYER, firstName: 'Alice', lastName: 'Smith' } as any;
      mockJwtService.signAsync.mockResolvedValueOnce('access_token').mockResolvedValueOnce('refresh_token');
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.loginWithOAuth(mockUser);
      expect(result).toHaveProperty('access_token', 'access_token');
      expect(result).toHaveProperty('refresh_token', 'refresh_token');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });
  });
});
