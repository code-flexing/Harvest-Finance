"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardBody, Container } from '@/components/ui';
import { Sprout, ShieldCheck, Gift } from 'lucide-react';

const features = [
  {
    title: 'Yield Farming',
    description: 'Automate your DeFi investments and earn the highest possible yields securely and passively across major protocols.',
    icon: <Sprout className="w-8 h-8 text-harvest-green-600" />,
    delay: 0.1,
  },
  {
    title: 'Smart Vaults',
    description: 'Deposit funds into algorithmic vaults that automatically compound your returns while managing risk exposure.',
    icon: <ShieldCheck className="w-8 h-8 text-harvest-green-600" />,
    delay: 0.2,
  },
  {
    title: 'Platform Rewards',
    description: 'Earn native tokens and exclusive boosts by actively participating in the ecosystem and staking your assets.',
    icon: <Gift className="w-8 h-8 text-harvest-green-600" />,
    delay: 0.3,
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <Container size="lg">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4"
          >
            Powerful tools for modern farmers
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="text-lg text-zinc-600 dark:text-zinc-400"
          >
            Everything you need to grow your digital wealth in one unified, elegant interface.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: feature.delay, duration: 0.5 }}
              whileHover={{ y: -10 }}
              className="h-full"
            >
              <Card className="h-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-xl hover:shadow-harvest-green-900/5 hover:border-harvest-green-200 dark:hover:border-harvest-green-900/50 transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="w-14 h-14 rounded-2xl bg-harvest-green-50 dark:bg-harvest-green-950/50 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{feature.title}</h3>
                </CardHeader>
                <CardBody>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};
