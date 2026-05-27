'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWalletStore, shortenAddress } from '@/store/wallet';
import { Button, Tooltip } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useToastStore } from '@/store/useToastStore';
import { Info, Wallet as WalletIconLucide } from 'lucide-react';
import { getTermTooltip } from '@/lib/defi-terms';
import { WalletConnectModal } from './WalletConnectModal';

export function WalletButton() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWalletStore();
  const { showToast } = useToastStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show toast notifications for connection events
  useEffect(() => {
    if (isConnected && address) {
      showToast(`Connected to ${shortenAddress(address)}`, 'success');
    }
  }, [isConnected, address, showToast]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const handleConnect = () => {
    setShowConnectModal(true);
  };

  const handleCopyAddress = async () => {
    if (!address) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(address);
      showToast('Address copied to clipboard', 'success');
    } catch (err) {
      showToast('Failed to copy address', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
    showToast('Wallet disconnected', 'info');
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button
          ref={connectButtonRef}
          variant="primary"
          size="md"
          onClick={handleConnect}
          isLoading={isConnecting}
          leftIcon={<WalletIconLucide className="w-4 h-4" />}
          disabled={isConnecting}
          className="rounded-xl font-bold shadow-lg shadow-harvest-green-500/20"
          aria-label={isConnecting ? 'Connecting to wallet...' : 'Connect wallet'}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        <WalletConnectModal 
          isOpen={showConnectModal} 
          onClose={() => setShowConnectModal(false)} 
        />
      </div>
    );
  }

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-harvest-green-300 hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-harvest-green-500 focus:ring-offset-2"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
        aria-label={`Wallet connected: ${shortenAddress(address!)}. Click to view options.`}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
          <span className="font-medium text-gray-700">{shortenAddress(address!)}</span>
        </div>
        <ChevronIcon isOpen={showDropdown} />
      </button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200"
          role="menu"
          aria-label="Wallet options"
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Connected Wallet</span>
              <Badge variant="success" size="sm" aria-label="Wallet status: Active">
                Active
              </Badge>
            </div>
            <p
              className="font-mono text-sm text-gray-800 break-all"
              aria-label={`Full wallet address: ${address}`}
            >
              {address}
            </p>
            <Tooltip content={getTermTooltip('trustlines')} position="bottom">
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1 cursor-help">
                <Info className="w-3 h-3 opacity-60" />
                Trustlines manage which assets your wallet can hold
              </div>
            </Tooltip>
          </div>

          <div className="p-2" role="none">
            <button
              onClick={handleCopyAddress}
              disabled={isCopying}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:bg-gray-50 disabled:opacity-50"
              role="menuitem"
              aria-label="Copy wallet address to clipboard"
            >
              <CopyIcon />
              {isCopying ? 'Copying...' : 'Copy Address'}
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:bg-red-50"
              role="menuitem"
              aria-label="Disconnect wallet"
            >
              <DisconnectIcon />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function WalletIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
