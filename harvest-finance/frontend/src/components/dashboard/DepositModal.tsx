'use client';

import React, { useState } from 'react';
import { 
  Modal, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Button, 
  Input,
  Stack,
  Badge
} from '@/components/ui';
import { Wallet, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: any;
  onSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  vault,
  onSuccess
}) => {
  const { token } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vault) {
    return null;
  }

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await axios.post(
        `http://localhost:3001/api/v1/farm-vaults/${vault.id}/deposit`,
        { amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
      onClose();
      setAmount('');
    } catch (err: any) {
      console.error('Deposit failed:', err);
      setError(err.response?.data?.message || 'Deposit failed. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Deposit Funds" onClose={onClose} />
      <ModalBody>
        <Stack gap="lg">
          <div className="bg-harvest-green-50 p-4 rounded-xl border border-harvest-green-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-harvest-green-700 uppercase tracking-wider">Active Vault</p>
              <h4 className="font-bold text-gray-900">{vault.name}</h4>
            </div>
            <Badge variant="success">
              APY: {vault.cropCycle?.yieldRate ?? vault.apy}
            </Badge>
          </div>

          <Input 
            label="Amount (USD)"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leftIcon={<Wallet className="w-4 h-4 text-gray-400" />}
            error={error || undefined}
            type="number"
            autoFocus
          />

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <p className="flex justify-between mb-1">
              <span>Current Balance:</span>
              <span className="font-bold text-gray-900">${vault.balance}</span>
            </p>
            <p className="flex justify-between">
              <span>Estimated Seasonal Yield:</span>
              <span className="font-bold text-harvest-green-600">
                +$
                {(
                  (Number(amount) || 0) *
                  (Number(String(vault.cropCycle?.yieldRate ?? vault.apy).replace(/[^0-9.]/g, '')) ||
                    0) /
                  100
                ).toFixed(2)}
              </span>
            </p>
          </div>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleDeposit} 
          isLoading={isLoading}
          leftIcon={<ArrowUpRight className="w-4 h-4" />}
        >
          Confirm Deposit
        </Button>
      </ModalFooter>
    </Modal>
  );
};
