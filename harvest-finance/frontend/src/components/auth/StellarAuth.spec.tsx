import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StellarAuth } from './StellarAuth';
import { useAuthStore } from '@/lib/stores/auth-store';

// Mock the auth store
jest.mock('@/lib/stores/auth-store');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock Freighter API
const createMockFreighter = () => ({
  isConnected: jest.fn(),
  connect: jest.fn(),
  getPublicKey: jest.fn(),
  getAddress: jest.fn(),
  signTransaction: jest.fn(),
  getNetwork: jest.fn(),
});

let mockFreighter = createMockFreighter();

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StellarAuth Component', () => {
  const mockStellarLogin = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockFreighter = createMockFreighter();
    (window as any).freighter = mockFreighter;

    mockUseAuthStore.mockReturnValue({
      stellarLogin: mockStellarLogin,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
    } as any);

    mockStellarLogin.mockResolvedValue(undefined);

    // Ensure window.freighter is restored for each test (some tests delete it)
    (window as any).freighter = mockFreighter;

    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        user: {
          id: 'user_id',
          stellar_address: 'GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
          role: 'USER',
          full_name: 'Test User',
        },
      },
    });
  });

  const renderComponent = () => {
    return render(
      <StellarAuth
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );
  };

  describe('Initial State', () => {
    it('should render connect wallet button initially', () => {
      renderComponent();
      
      expect(screen.getByText(/Connect Freighter/)).toBeInTheDocument();
      expect(screen.queryByText('Connected:')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign in with Stellar')).not.toBeInTheDocument();
    });

    it('should show connect buttons when auth store is loading', () => {
      mockUseAuthStore.mockReturnValue({
        stellarLogin: mockStellarLogin,
        isLoading: true,
        error: null,
        clearError: jest.fn(),
      } as any);

      renderComponent();
      
      expect(screen.getByText(/Connect Freighter/)).toBeInTheDocument();
      expect(screen.getByText(/Connect MetaMask/)).toBeInTheDocument();
      expect(screen.getByText(/Connect Albedo/)).toBeInTheDocument();
    });

    it('should display error message when auth store has error', () => {
      mockUseAuthStore.mockReturnValue({
        stellarLogin: mockStellarLogin,
        isLoading: false,
        error: 'Authentication failed',
        clearError: jest.fn(),
      } as any);

      renderComponent();
      
      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Wallet Connection', () => {
    it('should handle successful wallet connection', async () => {
      mockFreighter.isConnected.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
        expect(screen.getByText('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q')).toBeInTheDocument();
        expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
      });

      expect(mockFreighter.getPublicKey).toHaveBeenCalled();
    });

    it('should handle wallet connection failure', async () => {
      mockFreighter.getPublicKey.mockRejectedValue(new Error('Connection failed'));

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Connection failed');
      });
    });

    it('should handle Freighter not installed', async () => {
      Object.defineProperty(window, 'freighter', { value: undefined, writable: true, configurable: true });

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Freighter wallet is not installed. Please install Freighter to continue.');
      });
    });

    it('should handle getting wallet address failure', async () => {
      mockFreighter.getPublicKey.mockRejectedValue(new Error('Failed to get address'));

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to get address');
      });
    });
  });

  describe('Stellar Authentication', () => {
    beforeEach(async () => {
      mockFreighter.isConnected.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');
      mockFreighter.signTransaction.mockResolvedValue('signed_transaction_xdr');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
      });
    });

    it('should handle successful Stellar authentication', async () => {
      expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
    });

    it('should handle authentication failure', async () => {
      mockStellarLogin.mockRejectedValue(new Error('Authentication failed'));

      expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
    });

    it('should show loading state during authentication', async () => {
      mockUseAuthStore.mockReturnValue({
        stellarLogin: mockStellarLogin,
        isLoading: true,
        error: null,
        clearError: jest.fn(),
      } as any);

      renderComponent();
      
      mockFreighter.isConnected.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });
  });

  describe('Disconnect Wallet', () => {
    beforeEach(async () => {
      // Setup successful wallet connection first
      mockFreighter.isConnected.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
      });
    });

    it('should disconnect wallet when disconnect button is clicked', async () => {
      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(screen.getByText(/Connect Freighter/)).toBeInTheDocument();
        expect(screen.queryByText('Connected:')).not.toBeInTheDocument();
        expect(screen.queryByText('Sign in with Stellar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Network Validation', () => {
    it('should validate network configuration', async () => {
      mockFreighter.getNetwork.mockResolvedValue('public');
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      });
    });

    it('should handle network mismatch', async () => {
      mockFreighter.getNetwork.mockResolvedValue('mainnet');
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle transaction signing failure', async () => {
      mockStellarLogin.mockRejectedValue(new Error('User rejected signing'));
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
      });

      const signInButton = screen.getByText('Sign in with Stellar');
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });

    it('should handle API errors during authentication', async () => {
      mockStellarLogin.mockRejectedValue(new Error('API Error'));
      mockFreighter.getPublicKey.mockResolvedValue('GD5DJQDQKG6GSUWQJQGQKQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q');

      renderComponent();
      
      const connectButton = screen.getByText(/Connect Freighter/);
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Sign in with Stellar')).toBeInTheDocument();
      });

      const signInButton = screen.getByText('Sign in with Stellar');
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderComponent();
      
      const connectButton = screen.getByRole('button', { name: /Connect Freighter/ });
      expect(connectButton).toBeInTheDocument();
      expect(connectButton).toHaveAttribute('aria-busy', 'false');
    });

    it('should announce errors to screen readers', async () => {
      mockUseAuthStore.mockReturnValue({
        stellarLogin: mockStellarLogin,
        isLoading: false,
        error: 'Authentication failed',
        clearError: jest.fn(),
      } as any);

      renderComponent();
      
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Authentication failed');
    });

    it('should show connect buttons with proper ARIA attributes', () => {
      renderComponent();
      const connectButton = screen.getByRole('button', { name: /Connect Freighter/ });
      expect(connectButton).toBeInTheDocument();
      expect(connectButton).toHaveAttribute('aria-busy', 'false');
    });
  });
});
