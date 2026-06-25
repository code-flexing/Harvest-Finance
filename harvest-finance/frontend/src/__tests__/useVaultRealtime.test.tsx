import { renderHook, act } from '@testing-library/react';
import { useVaultRealtime } from '../hooks/useVaultRealtime';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

const mockIo = io as jest.MockedFunction<typeof io>;

describe('useVaultRealtime', () => {
  let mockSocket: {
    connected: boolean;
    id: string;
    emit: jest.Mock;
    on: jest.Mock;
    disconnect: jest.Mock;
    join: jest.Mock;
    leave: jest.Mock;
  };
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
    };

    mockIo.mockReturnValue(mockSocket as unknown as jest.Mocked<Socket>);
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
    expect(result.current.activities).toEqual([]);
    expect(result.current.latestEvent).toBeNull();
    expect(result.current.isPaused).toBe(false);
  });

  it('should create socket connection on mount', () => {
    renderHook(() => useVaultRealtime());

    expect(mockIo).toHaveBeenCalledWith(
      expect.stringContaining('vault-activity'),
      expect.objectContaining({
        transports: ['websocket', 'polling'],
        reconnection: true,
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
  });

  it('should add activity events to list', () => {
    const { result } = renderHook(() => useVaultRealtime({ maxActivityItems: 50 }));

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
    const { result } = renderHook(() => useVaultRealtime({ maxActivityItems: 3 }));

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

    expect(result.current.activities).toHaveLength(3);
    // Most recent should be first
    expect(result.current.activities[0].vaultId).toBe('v4');
  });

  it('should subscribe to vaults on connection', () => {
    renderHook(() => useVaultRealtime({ vaultIds: ['v1', 'v2'] }));

    act(() => {
      simulateEvent('connect', {});
    });

    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'v1');
    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'v2');
  });

  it('should subscribe to target vault on connect', () => {
    renderHook(() => useVaultRealtime({ targetVaultId: 'vault-123' }));

    act(() => {
      simulateEvent('connect', {});
    });

    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'vault-123');
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
        type: 'deposit',
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
    expect(result.current.connectionError).toBe('Connection lost: transport close');
  });

  it('should handle socket errors', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    act(() => {
      simulateEvent('connect_error', { message: 'Authentication failed' });
    });

    expect(result.current.connectionError).toBe('Authentication failed');
  });

  it('should handle reconnect events', () => {
    const { result } = renderHook(() => useVaultRealtime({ targetVaultId: 'vault-123' }));

    act(() => {
      simulateEvent('connect', {});
    });

    act(() => {
      simulateEvent('disconnect', 'transport close');
    });

    expect(result.current.isConnected).toBe(false);

    act(() => {
      simulateEvent('reconnect', 1);
    });

    // reconnect handler clears connection error - verify it's cleared
    expect(result.current.connectionError).toBe(null);
  });

  it('should handle reconnect_attempt', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('reconnect_attempt', 2);
    });

    // The reconnectAttemptsRef is set but since it's a ref, the current value persists
    // Let's verify the on handler was registered
    expect(mockOn).toHaveBeenCalledWith('reconnect_attempt', expect.any(Function));
  });

  it('should handle reconnect_error', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    act(() => {
      simulateEvent('reconnect_error', { message: 'Server unreachable' });
    });

    expect(result.current.connectionError).toBe('Reconnection failed: Server unreachable');
  });

  it('should clean up socket on unmount', () => {
    const { unmount } = renderHook(() => useVaultRealtime());

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should filter activities by targetVaultId', () => {
    const { result } = renderHook(() => useVaultRealtime({ targetVaultId: 'vault-123' }));

    act(() => {
      simulateEvent('connect', {});
    });

    const depositEvent1 = {
      type: 'deposit',
      vaultId: 'vault-123',
      vaultName: 'Target Vault',
      amount: 100,
      timestamp: new Date().toISOString(),
    };

    const depositEvent2 = {
      type: 'deposit',
      vaultId: 'vault-456',
      vaultName: 'Other Vault',
      amount: 200,
      timestamp: new Date().toISOString(),
    };

    act(() => {
      simulateEvent('vault:activity', depositEvent1);
    });

    act(() => {
      simulateEvent('vault:activity', depositEvent2);
    });

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].vaultId).toBe('vault-123');
  });

  it('should listen to vault-specific channel when targetVaultId is provided', () => {
    renderHook(() => useVaultRealtime({ targetVaultId: 'vault-123' }));

    expect(mockOn).toHaveBeenCalledWith(
      'vault:vault-123:activity',
      expect.any(Function)
    );
  });

  it('should support yield_compounded event type', () => {
    const { result } = renderHook(() => useVaultRealtime({ maxActivityItems: 5 }));

    act(() => {
      simulateEvent('connect', {});
    });

    const yieldEvent = {
      type: 'yield_compounded',
      vaultId: 'v1',
      vaultName: 'Yield Vault',
      amount: 25,
      yieldAmount: 25,
      timestamp: new Date().toISOString(),
    };

    act(() => {
      simulateEvent('vault:activity', yieldEvent);
    });

    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].type).toBe('yield_compounded');
  });

  it('should support walletAddress in events', () => {
    const { result } = renderHook(() => useVaultRealtime({ maxActivityItems: 5 }));

    act(() => {
      simulateEvent('connect', {});
    });

    const depositWithWallet = {
      type: 'deposit',
      vaultId: 'v1',
      vaultName: 'Test Vault',
      amount: 100,
      walletAddress: 'GABC123XYZ456',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      simulateEvent('vault:activity', depositWithWallet);
    });

    expect(result.current.activities[0].walletAddress).toBe('GABC123XYZ456');
  });

  it('should re-subscribe to target vault on reconnect', () => {
    renderHook(() => useVaultRealtime({ targetVaultId: 'vault-reconnect' }));

    act(() => {
      simulateEvent('connect', {});
    });

    // Reset mock to check reconnect subscription
    mockEmit.mockClear();

    act(() => {
      simulateEvent('reconnect', 1);
    });

    expect(mockEmit).toHaveBeenCalledWith('subscribe:vault', 'vault-reconnect');
  });

  it('should not set connection error on intentional client disconnect', () => {
    const { result } = renderHook(() => useVaultRealtime());

    act(() => {
      simulateEvent('connect', {});
    });

    act(() => {
      simulateEvent('disconnect', 'io client disconnect');
    });

    expect(result.current.connectionError).toBe(null);
  });
});