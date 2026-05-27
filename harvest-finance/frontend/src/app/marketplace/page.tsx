'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, Plus, ShoppingBag, TrendingUp, Users, Star } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Container, Section, Button, Badge } from '@/components/ui';
import { ListingCard, Listing } from '@/components/marketplace/ListingCard';
import { CreateListingModal } from '@/components/marketplace/CreateListingModal';

const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Fresh Organic Maize — Harvest Season',
    description: 'Premium quality dried maize from our family farm in Kaduna. Pesticide-free, sun-dried. Available for pickup or delivery within 50km.',
    category: 'CROPS',
    price: 18.5,
    currency: 'USD',
    quantity: 500,
    unit: 'kg',
    deliveryOption: 'BOTH',
    location: 'Kaduna, Nigeria',
    seller: { id: 's1', firstName: 'Ibrahim', lastName: 'Sani', rating: 4.8, reviewCount: 32 },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Improved Tomato Seeds (Roma VF)',
    description: 'Certified Roma VF tomato seeds — high yield, disease resistant. Suitable for rain-fed and irrigated conditions.',
    category: 'SEEDS',
    price: 5.0,
    currency: 'USD',
    quantity: 200,
    unit: 'bag',
    deliveryOption: 'DELIVERY',
    location: 'Kano, Nigeria',
    seller: { id: 's2', firstName: 'Fatima', lastName: 'Yusuf', rating: 4.6, reviewCount: 18 },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Hand-Operated Maize Sheller',
    description: 'Durable cast-iron maize sheller. Processes approximately 200kg/hour. Well-maintained, used for 1 season. Selling as upgrading to motorised unit.',
    category: 'TOOLS',
    price: 45.0,
    currency: 'USD',
    quantity: 1,
    unit: 'unit',
    deliveryOption: 'PICKUP_ONLY',
    location: 'Abuja, Nigeria',
    seller: { id: 's3', firstName: 'Chukwuemeka', lastName: 'Eze', rating: 5.0, reviewCount: 7 },
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Tractor Ploughing Service',
    description: 'Available for hire — 65HP tractor with disc plough. Rate per hectare. Minimum 2ha per booking. Covering Ogun and surrounding states.',
    category: 'SERVICES',
    price: 75.0,
    currency: 'USD',
    quantity: 100,
    unit: 'hour',
    deliveryOption: 'DELIVERY',
    location: 'Abeokuta, Ogun',
    seller: { id: 's4', firstName: 'Adewale', lastName: 'Akinwumi', rating: 4.9, reviewCount: 44 },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'Cassava Tubers — TMS 30572 Variety',
    description: 'High-starch TMS 30572 cassava, freshly harvested. Ideal for processing to garri, flour, or starch. Bulk orders welcome.',
    category: 'CROPS',
    price: 12.0,
    currency: 'USD',
    quantity: 1000,
    unit: 'kg',
    deliveryOption: 'BOTH',
    location: 'Enugu, Nigeria',
    seller: { id: 's5', firstName: 'Ngozi', lastName: 'Obi', rating: 4.7, reviewCount: 25 },
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    title: 'Sunflower Seeds (High Oil Variety)',
    description: 'Import-quality sunflower seeds with 42%+ oil content. Certified origin. Min order 50kg.',
    category: 'SEEDS',
    price: 3.2,
    currency: 'USD',
    quantity: 300,
    unit: 'kg',
    deliveryOption: 'DELIVERY',
    location: 'Lagos, Nigeria',
    seller: { id: 's6', firstName: 'Oluwaseun', lastName: 'Bello', rating: 4.4, reviewCount: 11 },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

const CATEGORIES = ['ALL', 'CROPS', 'SEEDS', 'TOOLS', 'SERVICES', 'LIVESTOCK', 'OTHER'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>(MOCK_LISTINGS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState('newest');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateListing = async (data: Record<string, unknown>) => {
    const newListing: Listing = {
      id: String(Date.now()),
      title: data.title as string,
      description: data.description as string,
      category: data.category as string,
      price: data.price as number,
      currency: data.currency as string,
      quantity: data.quantity as number,
      unit: data.unit as string,
      deliveryOption: data.deliveryOption as Listing['deliveryOption'],
      location: data.location as string,
      seller: { id: 'me', firstName: 'You', lastName: '' },
      createdAt: new Date().toISOString(),
    };
    setListings((prev) => [newListing, ...prev]);
    // await apiClient.post('/api/v1/marketplace/listings', data);
  };

  const handleOrder = (id: string) => {
    alert(`Order flow for listing ${id} — connect to /api/v1/marketplace/orders`);
  };

  const handleViewSeller = (id: string) => {
    // navigate to seller profile
  };

  const filtered = listings
    .filter((l) => category === 'ALL' || l.category === category)
    .filter((l) => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.location?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1f14] flex flex-col">
      <Header />

      <Section className="flex-1 py-8">
        <Container>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-50">Co-Op Marketplace</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Buy and sell crops, seeds, tools & services from fellow farmers</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" />
              List Item
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Active Listings', value: '2,480', icon: ShoppingBag },
              { label: 'Total Volume', value: '$48K', icon: TrendingUp },
              { label: 'Sellers', value: '612', icon: Users },
              { label: 'Avg Rating', value: '4.7', icon: Star },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white dark:bg-[#1a3020] rounded-xl p-3 flex items-center gap-3 border border-gray-100 dark:border-[rgba(141,187,85,0.12)]">
                <Icon className="w-5 h-5 text-harvest-green-600 dark:text-harvest-green-400" />
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-zinc-50">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search listings or locations…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-harvest-green-600 text-white'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:border-harvest-green-400'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">{filtered.length} listings found</p>

          {/* Listings grid */}
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onOrder={handleOrder}
                  onViewSeller={handleViewSeller}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No listings match your search.</p>
              <button onClick={() => { setSearch(''); setCategory('ALL'); }} className="text-xs text-harvest-green-600 hover:underline mt-1">
                Clear filters
              </button>
            </div>
          )}
        </Container>
      </Section>

      <Footer />

      {showCreate && (
        <CreateListingModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateListing}
        />
      )}
    </div>
  );
}
