import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../database/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

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

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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

      mockAuthService.refresh.mockResolvedValue({ access_token: 'new_access_token' });

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

      mockAuthService.logout.mockResolvedValue({ success: true, message: 'Logged out successfully' });

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
});
