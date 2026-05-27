import { Test, TestingModule } from '@nestjs/testing';
import { VaultGateway } from './vault.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Vault } from '../database/entities/vault.entity';

describe('VaultGateway', () => {
  let gateway: VaultGateway;
  let jwtService: JwtService;
  let configService: ConfigService;
  let vaultRepository: Repository<Vault>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: 'user-1', email: 'test@test.com' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_secret'),
          },
        },
        {
          provide: 'VaultRepository',
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<VaultGateway>(VaultGateway);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    vaultRepository = module.get<Repository<Vault>>('VaultRepository');

    // Mock the WebSocket server
    gateway['server'] = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should emit deposit event', () => {
    const data = {
      vaultId: 'v1',
      vaultName: 'Vault 1',
      asset: 'USDC',
      amount: 100,
      userId: 'u1',
      newBalance: 1000,
    };

    gateway.emitDeposit(data);

    expect(gateway['server'].emit).toHaveBeenCalledWith(
      'vault:activity:global',
      expect.objectContaining({
        type: 'deposit',
        vaultId: 'v1',
        amount: 100,
      }),
    );
  });

  it('should emit harvest event', () => {
    const data = {
      vaultId: 'v1',
      vaultName: 'Vault 1',
      asset: 'STLR',
      amount: 5.5,
      userId: 'u1',
    };

    gateway.emitHarvest(data);

    expect(gateway['server'].emit).toHaveBeenCalledWith(
      'vault:activity:global',
      expect.objectContaining({
        type: 'harvest',
        amount: 5.5,
        asset: 'STLR',
      }),
    );
  });

  it('should authenticate client with valid JWT token', async () => {
    const mockSocket = {
      id: 'socket-1',
      handshake: {
        auth: { token: 'valid_token' },
      },
      disconnect: jest.fn(),
      userId: undefined,
      isAuthenticated: false,
      join: jest.fn(),
      emit: jest.fn(),
    } as any;

    await gateway.handleConnection(mockSocket);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_token', {
      secret: 'test_secret',
    });
    expect(mockSocket.userId).toBe('user-1');
    expect(mockSocket.isAuthenticated).toBe(true);
  });

  it('should reject subscription for non-owned vault', async () => {
    const mockVault = {
      id: 'v2',
      vaultName: 'Other Vault',
      ownerId: 'other-user',
      isPublic: false,
    };

    vaultRepository.findOne = jest.fn().mockResolvedValue(mockVault);

    const mockSocket = {
      id: 'socket-2',
      userId: 'user-1',
      isAuthenticated: true,
      join: jest.fn(),
      emit: jest.fn(),
    } as any;

    await gateway.handleSubscribeVault('v2', mockSocket);

    expect(vaultRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'v2' },
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Access denied to vault',
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
  });

  it('should allow subscription to owned vault', async () => {
    const mockVault = {
      id: 'v1',
      vaultName: 'My Vault',
      ownerId: 'user-1',
      isPublic: true,
    };

    vaultRepository.findOne = jest.fn().mockResolvedValue(mockVault);

    const mockSocket = {
      id: 'socket-3',
      userId: 'user-1',
      isAuthenticated: true,
      join: jest.fn(),
      emit: jest.fn(),
    } as any;

    await gateway.handleSubscribeVault('v1', mockSocket);

    expect(mockSocket.join).toHaveBeenCalledWith('vault:v1');
    expect(mockSocket.emit).toHaveBeenCalledWith('subscribed:vault', {
      vaultId: 'v1',
      vaultName: 'My Vault',
    });
  });
});
