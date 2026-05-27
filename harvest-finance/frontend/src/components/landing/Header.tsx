import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button, Container, Inline, ThemeToggle } from '@/components/ui';
import { Leaf, Menu } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

export const Header = () => {
  const { t } = useTranslation();
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-harvest-green-100 dark:bg-black/80 dark:border-white/10">
      <Container size="xl">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-2 text-harvest-green-700 dark:text-harvest-green-400">
            <Leaf className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">Harvest Finance</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-zinc-600 hover:text-harvest-green-600 dark:text-zinc-400 dark:hover:text-harvest-green-400 transition-colors">
              {t('landing.header.features')}
            </Link>
            <Link href="#benefits" className="text-sm font-medium text-zinc-600 hover:text-harvest-green-600 dark:text-zinc-400 dark:hover:text-harvest-green-400 transition-colors">
              {t('landing.header.benefits')}
            </Link>
            <Link href="/community" className="text-sm font-medium text-zinc-600 hover:text-harvest-green-600 dark:text-zinc-400 dark:hover:text-harvest-green-400 transition-colors">
              Community
            </Link>
            <Link href="/marketplace" className="text-sm font-medium text-zinc-600 hover:text-harvest-green-600 dark:text-zinc-400 dark:hover:text-harvest-green-400 transition-colors">
              Marketplace
            </Link>
          </nav>

          <Inline className="hidden md:flex">
            <ThemeToggle />
            <Button variant="outline" className="border-harvest-green-200 text-harvest-green-700 hover:bg-harvest-green-50">
              {t('landing.header.login')}
            </Button>
            <Link href="/vaults">
              <Button className="bg-harvest-green-600 hover:bg-harvest-green-700 text-white">
                {t('landing.header.launch_app')}
              </Button>
            </Link>
            <LanguageSwitcher />
          </Inline>

          <Inline className="md:hidden">
            <ThemeToggle />
            <button className="p-2 text-zinc-600 dark:text-zinc-400">
              <Menu className="w-6 h-6" />
            </button>
          </Inline>
        </div>
      </Container>
    </header>
  );
};
