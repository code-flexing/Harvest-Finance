"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui';
import { Droplet, Eye, LockKeyhole } from 'lucide-react';

const benefits = [
  {
    title: 'Sustainable Finance',
    description: 'We prioritize eco-friendly blockchain networks and sustainable yield strategies to minimize environmental impact.',
    icon: <Droplet className="w-6 h-6 text-white" />,
    color: 'bg-emerald-500',
  },
  {
    title: 'Transparent Yields',
    description: 'Real-time on-chain analytics and open-source smart contracts ensure you always know where your returns come from.',
    icon: <Eye className="w-6 h-6 text-white" />,
    color: 'bg-harvest-green-500',
  },
  {
    title: 'Secure Contracts',
    description: 'Audited by top security firms with multi-sig protections and timelocks to keep your assets safe at all times.',
    icon: <LockKeyhole className="w-6 h-6 text-white" />,
    color: 'bg-teal-500',
  },
];

export const BenefitsSection = () => {
  return (
    <section id="benefits" className="py-24 bg-white dark:bg-black relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute -left-40 top-20 w-80 h-80 bg-harvest-green-200/40 dark:bg-harvest-green-900/20 blur-3xl rounded-full mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>

      <Container size="lg">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1">
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-tight"
            >
              Finance that works for you, <br/>
              <span className="text-harvest-green-600 dark:text-harvest-green-500">and the planet.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-zinc-600 dark:text-zinc-400 mb-8"
            >
              Harvest Finance bridges the gap between traditional yields and modern decentralized finance, maintaining a focus on security, transparency, and sustainability.
            </motion.p>
          </div>
          
          <div className="flex-1 flex flex-col gap-8 w-full">
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="flex gap-6 group"
              >
                <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${benefit.color} transition-transform group-hover:-translate-y-1`}>
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};
