'use client';

import React from 'react';
import { MapPin, Package, Star, Truck } from 'lucide-react';
import { Card, CardBody, Badge, Button } from '@/components/ui';

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  quantity: number;
  unit: string;
  deliveryOption: 'PICKUP_ONLY' | 'DELIVERY' | 'BOTH';
  location?: string;
  imageUrl?: string;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    rating?: number;
    reviewCount?: number;
  };
  createdAt: string;
}

interface ListingCardProps {
  listing: Listing;
  onOrder: (id: string) => void;
  onViewSeller: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  CROPS: 'success',
  SEEDS: 'info',
  TOOLS: 'warning',
  SERVICES: 'default',
  LIVESTOCK: 'error',
  OTHER: 'default',
};

const DELIVERY_LABELS: Record<string, string> = {
  PICKUP_ONLY: 'Pickup',
  DELIVERY: 'Delivery',
  BOTH: 'Pickup & Delivery',
};

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onOrder, onViewSeller }) => (
  <Card className="border border-gray-100 dark:border-[rgba(141,187,85,0.12)] hover:shadow-md transition-shadow h-full flex flex-col">
    {listing.imageUrl ? (
      <img
        src={listing.imageUrl}
        alt={listing.title}
        className="w-full h-40 object-cover rounded-t-xl"
      />
    ) : (
      <div className="w-full h-40 rounded-t-xl bg-gradient-to-br from-harvest-green-50 to-harvest-green-100 dark:from-harvest-green-950/30 dark:to-harvest-green-900/20 flex items-center justify-center">
        <Package className="w-12 h-12 text-harvest-green-300 dark:text-harvest-green-700" />
      </div>
    )}

    <CardBody className="p-4 flex flex-col flex-1">
      <div className="flex items-start justify-between mb-2">
        <Badge variant={(CATEGORY_COLORS[listing.category] ?? 'default') as any} isPill className="text-xs">
          {listing.category}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
          <Truck className="w-3 h-3" />
          {DELIVERY_LABELS[listing.deliveryOption]}
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 mb-1 line-clamp-1">{listing.title}</h3>
      <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 flex-1">{listing.description}</p>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-harvest-green-600 dark:text-harvest-green-400">
              {listing.currency} {Number(listing.price).toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 ml-1">/{listing.unit}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            Qty: {listing.quantity} {listing.unit}
          </span>
        </div>

        {listing.location && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
            <MapPin className="w-3 h-3" />
            {listing.location}
          </div>
        )}

        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => onViewSeller(listing.seller.id)}
        >
          <div className="w-6 h-6 rounded-full bg-harvest-green-100 dark:bg-harvest-green-900/40 flex items-center justify-center text-xs font-semibold text-harvest-green-700 dark:text-harvest-green-300">
            {listing.seller.firstName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-zinc-300 group-hover:text-harvest-green-600 transition-colors truncate">
              {listing.seller.firstName} {listing.seller.lastName}
            </p>
            {listing.seller.rating !== undefined && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs text-gray-500 dark:text-zinc-400">{listing.seller.rating.toFixed(1)} ({listing.seller.reviewCount})</span>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="w-full mt-1"
          onClick={() => onOrder(listing.id)}
        >
          Order Now
        </Button>
      </div>
    </CardBody>
  </Card>
);
