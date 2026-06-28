'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatCurrency, formatPercentage } from '@/lib/vault-utils';
import { Globe, User, Shield, CreditCard, Bell, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const sampleAmount = 1250.50;
  const samplePercentage = 18.45;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('sidebar.settings')}
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage your account preferences, localizations, and settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[250px_1fr]">
          {/* Settings Navigation */}
          <aside className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm font-semibold bg-harvest-green-50 text-harvest-green-700 dark:bg-harvest-green-900/40 dark:text-harvest-green-300">
              <Globe className="w-4 h-4" />
              <span>Language & Locale</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-[#162a1a] transition-colors">
              <User className="w-4 h-4" />
              <span>Account Profile</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-[#162a1a] transition-colors">
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-[#162a1a] transition-colors">
              <CreditCard className="w-4 h-4" />
              <span>Billing & Plan</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-[#162a1a] transition-colors">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
          </aside>

          {/* Settings Panels */}
          <div className="space-y-6">
            {/* Language Selection Card */}
            <div className="bg-white dark:bg-[#162a1a] rounded-2xl border border-slate-200 dark:border-[rgba(141,187,85,0.15)] p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-harvest-green-600 dark:text-harvest-green-400" />
                <span>Language Settings</span>
              </h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                Select your preferred language. All metrics, menus, and AI chat suggestions will update instantly.
              </p>

              <div className="grid gap-3 mt-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { code: 'en', label: 'English', name: 'English' },
                  { code: 'yo', label: 'Yorùbá', name: 'Yoruba' },
                  { code: 'ig', label: 'Igbò', name: 'Igbo' },
                  { code: 'ha', label: 'Hausa', name: 'Hausa' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                      i18n.language === lang.code
                        ? 'border-harvest-green-500 bg-harvest-green-50/50 dark:bg-harvest-green-950/20 ring-1 ring-harvest-green-500'
                        : 'border-slate-200 hover:border-slate-300 dark:border-gray-800 dark:hover:border-gray-700'
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lang.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      {lang.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Locale-aware Formatting Showcase Card */}
            <div className="bg-white dark:bg-[#162a1a] rounded-2xl border border-slate-200 dark:border-[rgba(141,187,85,0.15)] p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-harvest-green-600 dark:text-harvest-green-400" />
                <span>Locale Formatting Preview</span>
              </h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                Your values dynamically adapt formatting rules, abbreviations, and native currency symbols.
              </p>

              <div className="grid gap-4 mt-6 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1a3020]/40 border border-slate-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Currency Formatting
                  </span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(sampleAmount)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    USD for English, NGN (₦) with auto-conversion for Yoruba, Igbo, and Hausa.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1a3020]/40 border border-slate-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Percentage / Numbers
                  </span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatPercentage(samplePercentage)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                    Uses localized decimal and separator structures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
