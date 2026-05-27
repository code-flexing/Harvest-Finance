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
  Badge,
  Card,
  CardBody,
  Tooltip,
  cn
} from '@/components/ui';
import { Sprout, Wheat, Coffee, Leaf, ChevronRight, Check, Info } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getTermTooltip } from '@/lib/defi-terms';
import axios from '@/lib/api-client';

const iconMap: Record<string, any> = {
  Sprout,
  Wheat,
  Coffee,
  Leaf
};

const mockCycles = [
  {
    id: 'maize-1',
    name: 'Maize - Rainy Season',
    yieldRate: 15,
    durationDays: 120,
    description: 'Optimal for rainy season maize production across Nigeria.',
    icon: 'Sprout',
  },
  {
    id: 'rice-1',
    name: 'Rice - High Yield',
    yieldRate: 18,
    durationDays: 150,
    description: 'Special cycle for high-yield paddy rice.',
    icon: 'Wheat',
  },
  {
    id: 'coffee-1',
    name: 'Coffee - Long Cycle',
    yieldRate: 25,
    durationDays: 365,
    description: 'Full year cycle for high-altitude coffee beans.',
    icon: 'Coffee',
  },
  {
    id: 'cocoa-1',
    name: 'Cocoa - Seasonal',
    yieldRate: 22,
    durationDays: 180,
    description: 'Standard seasonal cycle for cocoa pods.',
    icon: 'Leaf',
  },
];

export function CreateVaultModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuthStore();
  const [step, setStep] = useState(1);
  const [cycles, setCycles] = useState<any[]>(mockCycles);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [vaultName, setVaultName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axios.get('http://localhost:3001/api/v1/farm-vaults/crop-cycles', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data && res.data.length > 0) {
          setCycles(res.data);
        }
      })
      .catch(err => {
        console.warn('Backend not available, using mock crop cycles:', err.message);
        setCycles(mockCycles);
      });
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!selectedCycle || !vaultName || !targetAmount) return;
    
    setIsLoading(true);
    try {
      await axios.post(
        'http://localhost:3001/api/v1/farm-vaults',
        { 
          name: vaultName, 
          cropCycleId: selectedCycle.id, 
          targetAmount: parseFloat(targetAmount) 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
      onClose();
      // Reset state
      setStep(1);
      setSelectedCycle(null);
      setVaultName('');
      setTargetAmount('');
    } catch (error) {
      console.warn('Backend not available, simulating vault creation:', error);
      // Simulate success for the demo
      alert(`Success! Farm Vault "${vaultName}" created successfully. (Simulated)`);
      onSuccess();
      onClose();
      // Reset state
      setStep(1);
      setSelectedCycle(null);
      setVaultName('');
      setTargetAmount('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title={step === 1 ? 'Choose Crop Cycle' : 'Vault Details'} />
      <ModalBody>
        {step === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cycles.map((cycle) => {
              const Icon = iconMap[cycle.icon] || Sprout;
              const isSelected = selectedCycle?.id === cycle.id;
              return (
                <div
                  key={cycle.id}
                  onClick={() => setSelectedCycle(cycle)}
                  className={cn(
                    "cursor-pointer rounded-xl border-2 p-4 transition-all relative overflow-hidden",
                    isSelected
                      ? "border-harvest-green-600 dark:border-harvest-green-500 bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] shadow-sm"
                      : "border-gray-200 dark:border-[rgba(141,187,85,0.15)] bg-white dark:bg-[#1f3826] hover:border-harvest-green-300 dark:hover:border-[rgba(141,187,85,0.3)] hover:bg-harvest-green-50/40 dark:hover:bg-[rgba(74,222,128,0.05)]"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-harvest-green-600 text-white rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <Icon className={cn("w-8 h-8 mb-3", isSelected ? "text-harvest-green-600 dark:text-harvest-green-400" : "text-gray-400 dark:text-gray-500")} />
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{cycle.name}</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-[10px] leading-relaxed mb-3 line-clamp-2">{cycle.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-harvest-green-100 dark:bg-[rgba(74,222,128,0.15)] text-harvest-green-800 dark:text-harvest-green-300">
                      +{cycle.yieldRate}% APY
                    </span>
                    <Tooltip content={getTermTooltip('slippage')} position="top">
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 cursor-help flex items-center gap-0.5">
                        Slippage
                        <Info className="w-2.5 h-2.5 opacity-60" />
                      </span>
                    </Tooltip>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{cycle.durationDays} Days</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Stack gap="lg">
            <div className="bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] p-4 rounded-xl flex items-center gap-4 border border-harvest-green-100 dark:border-[rgba(74,222,128,0.2)]">
              <div className="w-12 h-12 bg-white dark:bg-[#1a3020] rounded-lg flex items-center justify-center text-harvest-green-600 dark:text-harvest-green-400 shadow-sm">
                {selectedCycle && React.createElement(iconMap[selectedCycle.icon] || Sprout, { className: "w-6 h-6" })}
              </div>
              <div>
                <h4 className="font-bold text-harvest-green-900 dark:text-harvest-green-100">{selectedCycle?.name}</h4>
                <Tooltip content={getTermTooltip('yield')} position="top">
                  <p className="text-harvest-green-700 dark:text-harvest-green-400 text-xs flex items-center gap-1 cursor-help">
                    Expected Yield: +{selectedCycle?.yieldRate}%
                    <Info className="w-3 h-3 opacity-60" />
                  </p>
                </Tooltip>
              </div>
            </div>

            <Stack gap="md">
              <Input 
                label="Vault Name" 
                placeholder="e.g. Maize Harvest 2024"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
              />
              <Input 
                label="Savings Goal (USD)" 
                placeholder="0.00"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
              <div className="p-3 bg-harvest-green-50 dark:bg-[rgba(74,222,128,0.08)] text-harvest-green-800 dark:text-harvest-green-300 border border-harvest-green-100 dark:border-[rgba(74,222,128,0.15)] rounded-lg text-xs flex gap-3">
                <div className="mt-0.5"><ChevronRight className="w-4 h-4" /></div>
                <p>Establishing a clear goal helps you stay committed to your agricultural savings plan.</p>
              </div>
            </Stack>
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        <Inline gap="md" className="w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          {step === 1 ? (
            <Button 
              variant="primary" 
              className="flex-1"
              disabled={!selectedCycle}
              onClick={() => setStep(2)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next Step
            </Button>
          ) : (
            <Button 
              variant="primary" 
              className="flex-1"
              isLoading={isLoading}
              disabled={!vaultName || !targetAmount}
              onClick={handleCreate}
            >
              Finish & Create
            </Button>
          )}
        </Inline>
      </ModalFooter>
    </Modal>
  );
}
