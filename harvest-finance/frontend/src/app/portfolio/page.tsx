'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Container, Section, Stack, Button } from '@/components/ui';
import { PortfolioOverview } from '@/components/portfolio/PortfolioOverview';
import { TransactionTable } from '@/components/portfolio/TransactionTable';
import { MOCK_STATS, MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { ArrowLeft, LayoutDashboard, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header / Navigation Overlay */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 mb-8">
        <Container>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 border-l border-gray-200 pl-4">
                My Portfolio
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                Dashboard
              </Button>
              <Button variant="primary" size="sm" leftIcon={<Wallet className="w-4 h-4" />}>
                Connect Wallet
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
        >
          <Section paddingY="none" className="mb-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
              <p className="text-gray-500">Track your assets, earnings, and performance across all Harvest vaults.</p>
            </div>
            <PortfolioOverview stats={MOCK_STATS} />
          </Section>

          <Section paddingY="none">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
              <p className="text-gray-500">A detailed log of your deposits, withdrawals, and reward claims.</p>
            </div>
            <TransactionTable transactions={MOCK_TRANSACTIONS} />
          </Section>
        </motion.div>
      </Container>
    </main>
  );
}
