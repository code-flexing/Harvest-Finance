import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { Leaf } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 pt-16 pb-8">
      <Container size="lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-harvest-green-700 dark:text-harvest-green-500 mb-4">
              <Leaf className="w-6 h-6" />
              <span className="text-xl font-bold tracking-tight">Harvest Finance</span>
            </Link>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
              Empowering the next generation of farmers with sustainable, transparent, and secure DeFi yields.
            </p>
            <div className="flex items-center gap-4 text-zinc-400">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-harvest-green-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-harvest-green-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-harvest-green-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Platform</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><Link href="#features" className="hover:text-harvest-green-600 transition-colors">Features</Link></li>
              <li><Link href="/vaults" className="hover:text-harvest-green-600 transition-colors">Smart Vaults</Link></li>
              <li><Link href="/staking" className="hover:text-harvest-green-600 transition-colors">Staking</Link></li>
              <li><Link href="/rewards" className="hover:text-harvest-green-600 transition-colors">Rewards</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><a href="#" className="hover:text-harvest-green-600 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-harvest-green-600 transition-colors">Security Audits</a></li>
              <li><a href="#" className="hover:text-harvest-green-600 transition-colors">Whitepaper</a></li>
              <li><a href="#" className="hover:text-harvest-green-600 transition-colors">Help Center</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><a href="mailto:hello@harvest.finance" className="hover:text-harvest-green-600 transition-colors">hello@harvest.finance</a></li>
              <li><a href="mailto:press@harvest.finance" className="hover:text-harvest-green-600 transition-colors">press@harvest.finance</a></li>
              <li><a href="#" className="hover:text-harvest-green-600 transition-colors">Partnerships</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Harvest Finance. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">Terms of Service</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};
