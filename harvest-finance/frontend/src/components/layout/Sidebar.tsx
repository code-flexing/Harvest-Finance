"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Settings,
  Sprout,
  Code2,
} from "lucide-react";

export const dashboardNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "Farm Vaults", href: "/dashboard/farm-vaults", icon: Sprout },
  { label: "Soroban Signing", href: "/dashboard/soroban-signing", icon: Code2 },
  { label: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-[#0d1f12] border-r border-gray-200 dark:border-[rgba(141,187,85,0.15)] h-screen sticky top-0 flex-col hidden md:flex z-10">
      <div className="h-16 shrink-0 border-b border-gray-100 px-6 dark:border-[rgba(141,187,85,0.12)] flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-harvest-green-600 dark:text-harvest-green-400 font-bold text-xl"
        >
          <Sprout className="w-6 h-6" />
          <span>Harvest</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-harvest-green-50 text-harvest-green-700 dark:bg-harvest-green-900/40 dark:text-harvest-green-300"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#162a1a] dark:hover:text-gray-100"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive
                    ? "text-harvest-green-600 dark:text-harvest-green-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
