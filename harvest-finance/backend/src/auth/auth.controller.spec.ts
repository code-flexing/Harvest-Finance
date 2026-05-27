import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StellarStrategy } from './strategies/stellar.strategy';
import { UserRole } from '../database/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockStellarStrategy: any;

  const mockAuthResponse = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: UserRole.FARMER,
      full_name: 'John Doe',
      phone_number: '+1234567890',
      stellar_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    },
  };

  const mockStellarChallengeResponse = {
    server_public_key:
      'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
    transaction: 'AAAA...',
    network_passphrase: 'Test SDF Network ; September 2015',
  };

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    mockStellarStrategy = {
      generateChallenge: jest.fn(),
      validate: jest.fn(),
      getServerPublicKey: jest
        .fn()
        .mockReturnValue(
          'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: StellarStrategy,
          useValue: mockStellarStrategy,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: UserRole.FARMER,
        full_name: 'John Doe',
        phone_number: '+1234567890',
        stellar_address: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshDto = {
        refresh_token: 'mock_refresh_token',
      };

      mockAuthService.refresh.mockResolvedValue({
        access_token: 'new_access_token',
      });

      const result = await controller.refresh(refreshDto);

      expect(result).toHaveProperty('access_token');
      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshDto);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer mock_token',
        },
      };

      mockAuthService.logout.mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await controller.logout(mockReq as any);

      expect(result).toHaveProperty('success', true);
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should request password reset', async () => {
      const forgotDto = {
        email: 'test@example.com',
      };

      mockAuthService.forgotPassword.mockResolvedValue({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });

      const result = await controller.forgotPassword(forgotDto);

      expect(result).toHaveProperty('success', true);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(forgotDto);
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const resetDto = {
        token: 'valid_token',
        new_password: 'NewSecurePass123!',
      };

      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        message: 'Password reset successfully',
      });

      const result = await controller.resetPassword(resetDto);

      expect(result).toHaveProperty('success', true);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(resetDto);
    });
  });

  describe('Stellar Authentication', () => {
    describe('generateStellarChallenge', () => {
      it('should generate a challenge for Stellar authentication', async () => {
        const challengeDto = {
          public_key:
            'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
        };

        mockStellarStrategy.generateChallenge.mockResolvedValue(
          'AAAAchallenge_xdr',
        );

        const result = await controller.generateStellarChallenge(challengeDto);

        expect(result).toEqual({
          server_public_key:
            'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
          transaction: 'AAAAchallenge_xdr',
          network_passphrase: 'Test SDF Network ; September 2015',
        });
        expect(mockStellarStrategy.generateChallenge).toHaveBeenCalledWith(
          challengeDto.public_key,
        );
      });

      it('should handle invalid public key', async () => {
        const challengeDto = {
          public_key: 'invalid_key',
        };

        mockStellarStrategy.generateChallenge.mockRejectedValue(
          new Error('Invalid public key format'),
        );

        await expect(
          controller.generateStellarChallenge(challengeDto),
        ).rejects.toThrow('Invalid public key format');
      });
    });

    describe('verifyStellarAuth', () => {
      it('should verify Stellar authentication and return tokens', async () => {
        const verifyDto = {
          transaction: 'AAAAsigned_transaction_xdr',
        };

        const mockUser = {
          id: 'stellar-user-id',
          stellarAddress:
            'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
          role: 'USER',
          firstName: 'Stellar',
          lastName: 'User',
        };

        mockStellarStrategy.validate.mockResolvedValue(mockUser as any);
        mockAuthService.generateTokens.mockResolvedValue({
          accessToken: 'stellar_access_token',
          refreshToken: 'stellar_refresh_token',
        });

        const result = await controller.verifyStellarAuth(verifyDto);

        expect(result).toEqual({
          access_token: 'stellar_access_token',
          refresh_token: 'stellar_refresh_token',
          user: {
            id: 'stellar-user-id',
            stellar_address:
              'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
            role: 'USER',
            full_name: 'Stellar User',
          },
        });
        expect(mockStellarStrategy.validate).toHaveBeenCalledWith(
          verifyDto.transaction,
        );
        expect(mockAuthService.generateTokens).toHaveBeenCalledWith(mockUser);
      });

      it('should handle invalid transaction', async () => {
        const verifyDto = {
          transaction: 'invalid_xdr',
        };

        mockStellarStrategy.validate.mockRejectedValue(
          new Error('Invalid transaction format'),
        );

        await expect(controller.verifyStellarAuth(verifyDto)).rejects.toThrow(
          'Invalid transaction format',
        );
      });

      it('should handle unauthorized access', async () => {
        const verifyDto = {
          transaction: 'AAAAunauthorized_transaction',
        };

        mockStellarStrategy.validate.mockRejectedValue(
          new Error('Authentication failed: Invalid signature'),
        );

        await expect(controller.verifyStellarAuth(verifyDto)).rejects.toThrow(
          'Authentication failed: Invalid signature',
        );
      });
    });
  });
});
