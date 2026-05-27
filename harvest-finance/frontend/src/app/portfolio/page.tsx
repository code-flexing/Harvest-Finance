'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Wallet, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Section,
  Stack,
  Button,
  Card,
  CardBody,
  Badge,
  ThemeToggle,
} from '@/components/ui';
import { PortfolioOverview } from '@/components/portfolio/PortfolioOverview';
import { TransactionTable } from '@/components/portfolio/TransactionTable';
import { MOCK_STATS, MOCK_TRANSACTIONS } from '@/lib/mock-data';

export default function PortfolioPage() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-gray-50/50 dark:bg-[#0d1f12] pb-20">
      {/* Header / Navigation Overlay */}
      <nav className="sticky top-0 z-10 bg-white dark:bg-[#162a1a] border-b border-gray-200 dark:border-[rgba(141,187,85,0.15)] py-4 mb-8">
        <Container>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  {t('portfolio.back')}
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white border-l border-gray-200 dark:border-[rgba(141,187,85,0.2)] pl-4">
                {t('portfolio.title')}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <Link href="/dashboard" className="shrink-0">
                <Button variant="outline" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                  {t('sidebar.dashboard')}
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Wallet className="w-4 h-4" />}
                className="shrink-0 bg-[#16a34a]! text-white! hover:bg-[#15803d]!"
              >
                {t('portfolio.connect_wallet')}
              </Button>
            </div>
          </div>
        </Container>
      </nav>

      <Container>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-10"
        >
          <Card variant="default" className="md:max-w-xs">
            <CardBody className="p-6">
              <Stack gap="md">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" size="sm">{t('portfolio.vaults_count', { count: 3 })}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('portfolio.asset_allocation')}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="h-2 w-1/2 bg-harvest-green-500 rounded-full" />
                    <div className="h-2 w-1/4 bg-blue-500 rounded-full" />
                    <div className="h-2 w-1/4 bg-gray-300 rounded-full" />
                  </div>
                </div>
              </Stack>
            </CardBody>
          </Card>

          <Section paddingY="none">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('portfolio.overview_title')}</h2>
              <p className="text-gray-500 dark:text-gray-400">{t('portfolio.overview_desc')}</p>
            </div>
            <PortfolioOverview stats={MOCK_STATS} />
          </Section>

          <Section paddingY="none">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('portfolio.transaction_history')}</h2>
              <p className="text-gray-500 dark:text-gray-400">{t('portfolio.transaction_desc')}</p>
            </div>
            <TransactionTable transactions={MOCK_TRANSACTIONS} />
          </Section>
        </motion.div>
      </Container>
    </main>
  );
}
