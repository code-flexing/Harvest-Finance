'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Menu, Sprout, Search, User as UserIcon, X } from 'lucide-react';
import { NotificationCenter } from '@/components/Notification/NotificationCenter';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';

const mobileNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Portfolio', href: '/portfolio', icon: Wallet },
  { label: 'Farm Vaults', href: '/dashboard/farm-vaults', icon: Sprout },
  { label: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex min-h-[100dvh]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-0 md:h-screen">
        <header className="md:hidden bg-white border-b border-gray-200 min-h-14 h-14 flex items-center px-3 sm:px-4 justify-between flex-shrink-0 z-20 sticky top-0 pt-[env(safe-area-inset-top,0px)]">
          <Link
            href="/"
            className="flex items-center gap-2 text-harvest-green-600 font-bold text-lg min-h-[44px]"
          >
            <Sprout className="w-5 h-5" />
            <span>Harvest</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 rounded-lg active:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500 touch-manipulation"
              aria-expanded={drawerOpen}
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <header className="hidden md:flex bg-white border-b border-gray-200 h-16 items-center px-8 justify-between flex-shrink-0 z-10 sticky top-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </span>
              <input
                type="search"
                placeholder="Search vaults, assets..."
                className="block w-full min-h-[44px] pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-harvest-green-500 focus:border-harvest-green-500 text-base sm:text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="h-8 w-px bg-gray-200 mx-2" />
            <button
              type="button"
              className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500 min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-full bg-harvest-green-100 flex items-center justify-center text-harvest-green-700 font-bold">
                <UserIcon className="w-5 h-5" />
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto pb-[env(safe-area-inset-bottom,0px)]">
            {children}
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 touch-manipulation"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
          />
          <nav className="absolute top-0 left-0 bottom-0 w-[min(100vw-3rem,20rem)] bg-white shadow-xl flex flex-col pt-[env(safe-area-inset-top,0px)]">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900">Menú</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-50 touch-manipulation"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3.5 rounded-xl text-base font-medium min-h-[48px] touch-manipulation ${
                      active
                        ? 'bg-harvest-green-50 text-harvest-green-800'
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${active ? 'text-harvest-green-600' : 'text-gray-400'}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
