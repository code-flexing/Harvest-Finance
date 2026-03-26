'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Input, 
  Stack, 
  Inline,
  Badge
} from '@/components/ui';
import { Wallet, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: {
    id: string;
    name: string;
    asset: string;
    walletBalance: string;
    tvl: string;
  } | null;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, vault }) => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!vault) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      
      const numAmount = parseFloat(value);
      const balance = parseFloat(vault.walletBalance);
      
      if (value !== '' && (isNaN(numAmount) || numAmount <= 0)) {
        setError('Please enter a valid amount');
      } else if (numAmount > balance) {
        setError('Insufficient wallet balance');
      } else {
        setError(null);
      }
    }
  };

  const handleMaxClick = () => {
    setAmount(vault.walletBalance);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!amount || error) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setIsSuccess(true);
    
    // Auto close after success
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalHeader title={`Deposit to ${vault.name}`} />
      
      <ModalBody>
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-harvest-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-harvest-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Deposit Successful!</h3>
            <p className="text-gray-600">
              You have successfully deposited {amount} {vault.asset} into the {vault.name}.
            </p>
          </div>
        ) : (
          <Stack gap="lg" className="py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Amount to Deposit</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  error={error || undefined}
                  className="pr-20"
                />
                <button
                  onClick={handleMaxClick}
                  className="absolute right-3 top-[34px] text-xs font-bold text-harvest-green-600 hover:text-harvest-green-700 bg-harvest-green-50 px-2 py-1 rounded"
                >
                  MAX
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Stack gap="sm">
                <Stack direction="row" justify="between">
                  <span className="text-sm text-gray-500">Wallet Balance</span>
                  <span className="text-sm font-semibold">{vault.walletBalance} {vault.asset}</span>
                </Stack>
                <Stack direction="row" justify="between">
                  <span className="text-sm text-gray-500">Available Capacity</span>
                  <span className="text-sm font-semibold">$1.2M</span>
                </Stack>
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <Stack direction="row" justify="between">
                    <span className="text-sm font-medium">Estimated APY</span>
                    <Badge variant="success" size="sm" isPill>8.5%</Badge>
                  </Stack>
                </div>
              </Stack>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </Stack>
        )}
      </ModalBody>
      
      {!isSuccess && (
        <ModalFooter>
          <Button variant="outline" onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirm} 
            isLoading={isLoading}
            isDisabled={!!error || !amount}
            className="px-8 bg-harvest-green-600 hover:bg-harvest-green-700 text-white"
          >
            Confirm Deposit
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
};
