import { renderHook, act } from '@testing-library/react';
import { useVaultRealtime } from '../useVaultRealtime';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth-store';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock zustand store
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

const mockIo = io as jest.MockedFunction<typeof io>;

describe('useVaultRealtime', () => {
  let mockSocket: jest.Mocked<Socket>;
  let mockEmit: jest.Mock;
  let mockOn: jest.Mock;
  let mockDisconnect: jest.Mock;

  beforeEach(() => {
    mockEmit = jest.fn();
    mockOn = jest.fn();
    mockDisconnect = jest.fn();

    mockSocket = {
      connected: false,
      id: 'socket-1',
      emit: mockEmit,
      on: mockOn,
      disconnect: mockDisconnect,
      join: jest.fn(),
      leave: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    mockIo.mockReturnValue(mockSocket);

    // Reset auth store mock
    (useAuthStore as jest.Mock).mockReturnValue({
      token: 'test-jwt-token',
      user: { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'FARMER' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const simulateEvent = (eventName: string, data: unknown) => {
    const listeners = mockOn.mock.calls
      .filter((call: unknown[]) => call[0] === eventName)
      .map((call: unknown[]) => call[1]);
    listeners.forEach((listener: (data: unknown) => void) => listener(data));
  };

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useVaultRealtime());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.activities).toEqual([]);
    expect(result.current.latestEvent).toBeNull();
  });

  it('should create socket with auth token on mount', () => {
    renderHook(() => useVaultRealtime());

    expect(mockIo).toHaveBeenCalledWith(
      expect.stringContaining('vault-activity'),
      expect.objectContaining({
        auth: { token: 'test-jwt-token' },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
      }),
    );
  });

  it('should handle connection event', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should add activity events to list', () => {
    const { result } = renderHook(() => useVaultRealtime({ maxActivityItems: 5 }));

    act(() => {
      simulateEvent('connect', {});
    });

    const depositEvent = {
      type: 'deposit',
      vaultId: 'v1',
      vaultName: 'Test Vault',
      amount: 100,
      userId: 'user-1',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      simulateEvent('vault:activity', depositEvent);
    });

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0]).toMatchObject(depositEvent);
    expect(result.current.latestEvent).toMatchObject(depositEvent);
  });

  it('should limit activities to maxActivityItems', () => {
    const { result } = renderHook(() => useVaultRealtime({ maxActivityItems: 2 }));

    act(() => {
      simulateEvent('connect', {});
    });

    for (let i = 0; i < 5; i++) {
      act(() => {
        simulateEvent('vault:activity', {
          type: 'deposit',
          vaultId: `v${i}`,
          vaultName: `Vault ${i}`,
          amount: i * 100,
          userId: 'user-1',
          timestamp: new Date().toISOString(),
        });
      });
    }

    expect(result.current.activities).toHaveLength(2);
    // Most recent should be first
    expect(result.current.activities[0].vaultId).toBe('v4');
  });

  it('should subscribe to vaults on connection when authenticated', () => {
    renderHook(() => useVaultRealtime({ vaultIds: ['v1', 'v2'] }));

    act(() => {
      simulateEvent('connect', {});
    });

    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'v1');
    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'v2');
  });

  it('should call subscribeToVault function', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      result.current.subscribeToVault('v3');
    });

    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'v3');
  });

  it('should call unsubscribeFromVault function', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      result.current.unsubscribeFromVault('v3');
    });

    expect(mockEmit).toHaveBeenCalledWith('unsubscribe:vault', 'v3');
  });

  it('should clear activities', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    act(() => {
      simulateEvent('vault:activity', {
        type: 'harvest',
        vaultId: 'v1',
        vaultName: 'Vault 1',
        amount: 50,
        userId: 'user-1',
        timestamp: new Date().toISOString(),
      });
    });

    expect(result.current.activities).toHaveLength(1);

    act(() => {
      result.current.clearActivities();
    });

    expect(result.current.activities).toEqual([]);
    expect(result.current.latestEvent).toBeNull();
  });

  it('should handle disconnect event', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      simulateEvent('disconnect', 'transport close');
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should handle socket errors', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    act(() => {
      simulateEvent('error', { message: 'Authentication failed' });
    });

    expect(result.current.connectionError).toBe('Authentication failed');
  });

  it('should clean up socket on unmount', () => {
    const { unmount } = renderHook(() => useVaultRealtime());

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should not use auth token when not authenticated', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      token: null,
      user: null,
    });

    renderHook(() => useVaultRealtime());

    expect(mockIo).toHaveBeenCalledWith(
      expect.stringContaining('vault-activity'),
      expect.objectContaining({
        auth: { token: null },
      }),
    );
  });
});
