"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button, Container, Badge } from '@/components/ui';
import { ArrowRight, Leaf } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-harvest-green-50 via-white to-white dark:from-harvest-green-950/20 dark:via-black dark:to-black"></div>
      <div className="absolute top-0 w-full h-[500px] bg-[url('/grid.svg')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none"></div>
      
      {/* Floating Leaves Animation */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-40 text-harvest-green-200 opacity-50 hidden md:block" style={{ left: '10%' }}
      >
        <Leaf size={64} />
      </motion.div>
      <motion.div 
        animate={{ y: [0, 30, 0], rotate: [0, -15, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-60 text-harvest-green-300 opacity-30 hidden md:block" style={{ right: '15%' }}
      >
        <Leaf size={48} />
      </motion.div>

      <Container size="lg">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="success" className="mb-6 py-1.5 px-4 text-sm bg-harvest-green-100 text-harvest-green-800 border-harvest-green-200">
              Cultivating the future of DeFi
            </Badge>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-4xl mb-6"
          >
            Grow Your Wealth with <span className="text-transparent bg-clip-text bg-gradient-to-r from-harvest-green-500 to-harvest-green-700">Sustainable</span> Yield Farming
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed"
          >
            Experience a clean, transparent, and secure platform designed for modern DeFi investors. Automate your yields and harvest the best returns across the ecosystem.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Button size="lg" className="bg-harvest-green-600 hover:bg-harvest-green-700 text-white gap-2 text-base px-8 h-14">
              Start Farming Now <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 h-14 px-8 text-base">
              Explore Vaults
            </Button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};
