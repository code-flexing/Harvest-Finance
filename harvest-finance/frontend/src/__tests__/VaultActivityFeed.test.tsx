import { render, screen, fireEvent } from '@testing-library/react';
import { VaultActivityFeed, anonymizeAddress } from '../components/VaultActivityFeed';
import { useVaultRealtime } from '@/hooks/useVaultRealtime';

// Mock the useVaultRealtime hook
jest.mock('@/hooks/useVaultRealtime');

// Treat the mocked hook as a plain jest mock in tests (avoid TypeScript-only syntax for runtime)
const mockUseVaultRealtime: any = useVaultRealtime;

describe('VaultActivityFeed', () => {
  const mockTogglePause = jest.fn();

  beforeEach(() => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component with vault id', () => {
    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(screen.getByText('Test Vault real-time events')).toBeInTheDocument();
  });

  it('should display loading state when no activities and disconnected', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: false,
      activities: [],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Connecting to live feed...')).toBeInTheDocument();
  });

  it('should display listening state when connected but no activities', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Listening for activity...')).toBeInTheDocument();
  });

  it('should render deposit activities with correct styling', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 1000,
          newBalance: 5000,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Test Vault')).toBeInTheDocument();
    expect(screen.getByText(/Deposit/)).toBeInTheDocument();
    const article = screen.getAllByRole('article')[0];
    expect(article).toHaveTextContent(/\+\$?\s?1,000/);
    expect(article).toHaveTextContent(/Balance:\s*\$?\s*5,000/);
  });

  it('should render withdrawal activities with correct styling', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'withdrawal',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 500,
          newBalance: 4500,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Test Vault')).toBeInTheDocument();
    expect(screen.getByText(/Withdrawal/)).toBeInTheDocument();
    const articleW = screen.getAllByRole('article')[0];
    expect(articleW).toHaveTextContent(/-\$?\s?500/);
  });

  it('should render yield_compounded activities with correct styling', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'yield_compounded',
          vaultId: 'vault-123',
          vaultName: 'Yield Vault',
          amount: 100,
          yieldAmount: 25,
          newBalance: 5100,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Yield Vault" />);

    const articleY = screen.getAllByRole('article')[0];
    expect(articleY).toHaveTextContent('Yield Vault');
    expect(articleY).toHaveTextContent(/Yield/);
    expect(articleY).toHaveTextContent(/25\s*.*yield compounded/i);
  });

  it('should filter out unsupported event types and only render deposit, withdrawal, and yield', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'milestone',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 0,
          timestamp: new Date().toISOString(),
        },
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 1000,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.queryByText('milestone')).not.toBeInTheDocument();
    expect(screen.getByText(/\+\$?\s?1,000/)).toBeInTheDocument();
  });

  it('should display pause indicator when paused', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 1000,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: true,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Auto-scroll paused. New events will appear at the top.')).toBeInTheDocument();
  });

  it('should render wallet address anonymized', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 1000,
          walletAddress: 'GABC123XYZ456DEF789',
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('GABC...789')).toBeInTheDocument();
  });

  it('should call togglePause when pause button is clicked', () => {
    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    const pauseButton = screen.getByRole('button', { name: /pause auto-scroll/i });
    fireEvent.click(pauseButton);

    expect(mockTogglePause).toHaveBeenCalled();
  });

  it('should show correct pause button state when paused', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 1000,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: true,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByRole('button', { name: /resume auto-scroll/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument();
  });

  it('should display live indicator when connected', () => {
    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should display offline indicator when disconnected', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: false,
      activities: [],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should display connection error when present', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: false,
      activities: [],
      latestEvent: null,
      isPaused: false,
      connectionError: 'Connection lost: network error',
      reconnectAttempts: 1,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('should use default maxEvents of 50', () => {
    render(<VaultActivityFeed vaultId="vault-123" />);

    expect(mockUseVaultRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ maxActivityItems: 50 })
    );
  });

  it('should use custom maxEvents when provided', () => {
    render(<VaultActivityFeed vaultId="vault-123" maxEvents={25} />);

    expect(mockUseVaultRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ maxActivityItems: 25 })
    );
  });

  it('should pass targetVaultId to hook', () => {
    render(<VaultActivityFeed vaultId="vault-custom-123" vaultName="Custom Vault" />);

    expect(mockUseVaultRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ targetVaultId: 'vault-custom-123' })
    );
  });

  it('should have accessible attributes on feed container', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Test Vault',
          amount: 1000,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    const feed = screen.getByRole('feed');
    expect(feed).toHaveAttribute('aria-live', 'polite');
    expect(feed).toHaveAttribute('aria-relevant', 'additions text');
  });

  it('should display multiple activities in correct order', () => {
    mockUseVaultRealtime.mockReturnValue({
      isConnected: true,
      activities: [
        {
          type: 'deposit',
          vaultId: 'vault-123',
          vaultName: 'Vault A',
          amount: 100,
          timestamp: new Date(Date.now() - 10000).toISOString(),
        },
        {
          type: 'withdrawal',
          vaultId: 'vault-123',
          vaultName: 'Vault B',
          amount: 50,
          timestamp: new Date().toISOString(),
        },
      ],
      latestEvent: null,
      isPaused: false,
      connectionError: null,
      reconnectAttempts: 0,
      togglePause: mockTogglePause,
      subscribeToVault: jest.fn(),
      unsubscribeFromVault: jest.fn(),
      clearActivities: jest.fn(),
    });

    render(<VaultActivityFeed vaultId="vault-123" vaultName="Test Vault" />);

    const vaultNames = screen.getAllByRole('article');
    // Most recent should appear first
    expect(vaultNames[0]).toHaveTextContent('Vault B');
    expect(vaultNames[1]).toHaveTextContent('Vault A');
  });
});

describe('anonymizeAddress', () => {
  it('should anonymize a long address correctly', () => {
    expect(anonymizeAddress('GABC123XYZ456DEF789')).toBe('GABC...789');
    expect(anonymizeAddress('ABCDEFGHIJKLMN')).toBe('ABCD...LMN');
    expect(anonymizeAddress('GA1234567890XYZ')).toBe('GA12...XYZ');
  });

  it('should return short address unchanged', () => {
    expect(anonymizeAddress('GABC')).toBe('GABC');
    expect(anonymizeAddress('GA123')).toBe('GA123');
    expect(anonymizeAddress('')).toBe('');
  });

  it('should handle null/undefined gracefully', () => {
    expect(anonymizeAddress(null)).toBe('');
    expect(anonymizeAddress(undefined)).toBe('');
  });

  it('should handle exactly 10 character address', () => {
    // Address exactly 10 chars: first 4 + ... + last 3 = 4 + 3 dots + 3 = 10 chars total
    // But we need to keep prefix + suffix, so for 10 chars we show prefix + ... + suffix
    // Actually: 10 chars -> first 4 + ... + last 3 = GABC...XYZ (would be 10 chars including dots)
    expect(anonymizeAddress('GABC123XYZ')).toBe('GABC...XYZ');
  });

  it('should handle 9 character address (minimum length)', () => {
    // For length < 10, we return as-is
    expect(anonymizeAddress('GABC123XY')).toBe('GABC123XY');
  });
});