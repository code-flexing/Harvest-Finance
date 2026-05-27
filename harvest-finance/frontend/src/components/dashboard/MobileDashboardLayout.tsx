'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  LayoutDashboard,
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  BrainCircuit,
  Activity,
  Bell,
  Settings,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { OfflineStatus } from './OfflineStatus';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  href?: string;
}

interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  userName?: string;
  walletAddress?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vaults', label: 'Vaults', icon: PiggyBank, badge: 4 },
  { id: 'deposit', label: 'Deposit', icon: TrendingUp },
  { id: 'ai', label: 'AI Insights', icon: BrainCircuit, badge: 3 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'notifications', label: 'Alerts', icon: Bell, badge: 2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileDashboardLayout({
  children,
  activeTab = 'dashboard',
  onTabChange,
  userName = 'Farmer',
  walletAddress,
}: MobileDashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);

  const handleNavClick = useCallback((itemId: string) => {
    onTabChange?.(itemId);
    setIsSidebarOpen(false);
  }, [onTabChange]);

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSidebarToggle}
              className="p-2 -ml-2 rounded-lg active:bg-gray-100 touch-manipulation"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5 text-gray-700" />
              ) : (
                <Menu className="h-5 w-5 text-gray-700" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-harvest-green-500 to-harvest-green-700 flex items-center justify-center">
                <PiggyBank className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold text-gray-900 leading-tight">Harvest Finance</h1>
                <p className="text-xs text-gray-500 leading-tight">Farm Dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <OfflineStatus compact />
            </div>
            <button
              onClick={() => setNotificationsExpanded(!notificationsExpanded)}
              className="relative p-2 rounded-lg active:bg-gray-100 touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-harvest-green-500" />
            </button>
          </div>
        </div>

        <div className="sm:hidden px-4 pb-3">
          <OfflineStatus compact showDetailed />
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } sm:static sm:transform-none sm:flex-shrink-0`}
        >
          <div 
            className={`absolute inset-0 bg-black/50 sm:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
          />
          
          <nav className="relative w-72 h-full bg-white shadow-xl sm:shadow-none flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-harvest-green-50 flex items-center justify-center">
                  <PiggyBank className="h-6 w-6 text-harvest-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{userName}</p>
                  {walletAddress && (
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeTab;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${
                      isActive 
                        ? 'bg-harvest-green-50 text-harvest-green-700 border-r-2 border-harvest-green-600' 
                        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-harvest-green-600' : 'text-gray-500'}`} />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge variant="primary" size="sm" isPill>
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-100">
              <OfflineStatus showDetailed />
            </div>
          </nav>
        </aside>

        <main id="main-content" className="flex-1 min-w-0">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-inset-bottom sm:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full touch-manipulation ${
                  isActive ? 'text-harvest-green-600' : 'text-gray-500'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-harvest-green-500 text-[10px] font-medium text-white flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="h-16 sm:hidden" />
    </div>
  );
}