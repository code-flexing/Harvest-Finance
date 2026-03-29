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
import { Wallet, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: any;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
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

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (Number(amount) > vault.balance) {
      setError('Insufficient balance in vault');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Assuming a withdraw endpoint exists similar to deposit
      await axios.post(
        `http://localhost:3001/api/v1/farm-vaults/${vault.id}/withdraw`,
        { amount: Number(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
      onClose();
      setAmount('');
    } catch (err: any) {
      console.error('Withdraw failed:', err);
      setError(err.response?.data?.message || 'Withdrawal failed. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const isEarlyWithrawal = (vault.projections?.progressPercentage || 0) < 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Withdraw Funds" onClose={onClose} />
      <ModalBody>
        <Stack gap="lg">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">From Vault</p>
              <h4 className="font-bold text-gray-900">{vault.name}</h4>
            </div>
            <Badge variant="error">{vault.projections?.progressPercentage}% Season</Badge>
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
              <span>Available Balance:</span>
              <span className="font-bold text-gray-900">${vault.balance}</span>
            </p>
          </div>

          {isEarlyWithrawal && (
            <div className="flex gap-3 bg-amber-50 p-3 rounded-xl border border-amber-100 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Attention:</strong> Your crop cycle is not yet complete. Early withdrawal may result in reduced seasonal dividends.
              </p>
            </div>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
        <Button 
          variant="danger" 
          onClick={handleWithdraw} 
          isLoading={isLoading}
          leftIcon={<ArrowDownLeft className="w-4 h-4" />}
        >
          Confirm Withdrawal
        </Button>
      </ModalFooter>
    </Modal>
  );
};
