'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui';

interface CreateListingModalProps {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

const CATEGORIES = ['CROPS', 'SEEDS', 'TOOLS', 'SERVICES', 'LIVESTOCK', 'OTHER'];
const DELIVERY_OPTIONS = [
  { value: 'PICKUP_ONLY', label: 'Pickup Only' },
  { value: 'DELIVERY', label: 'Delivery Available' },
  { value: 'BOTH', label: 'Pickup & Delivery' },
];

export const CreateListingModal: React.FC<CreateListingModalProps> = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    title: '', description: '', category: 'CROPS', price: '', quantity: '',
    unit: 'kg', deliveryOption: 'PICKUP_ONLY', location: '', currency: 'USD',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ ...form, price: Number(form.price), quantity: Number(form.quantity) });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a3020] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-700/50 sticky top-0 bg-white dark:bg-[#1a3020] z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Create Listing</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Title *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={150}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Description *</label>
            <textarea required value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} maxLength={3000}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Delivery</label>
              <select value={form.deliveryOption} onChange={(e) => set('deliveryOption', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500">
                {DELIVERY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Price *</label>
              <div className="flex">
                <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
                  className="px-2 py-2 text-sm rounded-l-lg border border-r-0 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 focus:outline-none">
                  {['USD', 'NGN', 'GHS', 'XOF'].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-r-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Unit</label>
              <select value={form.unit} onChange={(e) => set('unit', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500">
                {['kg', 'tonne', 'bag', 'litre', 'unit', 'hour'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Quantity Available *</label>
            <input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => set('quantity', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1 block">Location (optional)</label>
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Kano, Nigeria"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-harvest-green-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" disabled={submitting}>
              <Plus className="w-4 h-4 mr-1" />
              {submitting ? 'Creating…' : 'Create Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
