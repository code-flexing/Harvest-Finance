"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui';

const Marker = ({ top, left, delay }: { top: string; left: string; delay: number }) => (
  <motion.div
    className="absolute w-3 h-3 bg-harvest-green-400 rounded-full shadow-[0_0_15px_3px_rgba(74,222,128,0.5)]"
    style={{ top, left }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0.2, 1, 0.2],
      scale: [0.8, 1.2, 0.8],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      delay,
      ease: "easeInOut"
    }}
  >
    <div className="absolute inset-0 bg-harvest-green-200 rounded-full animate-ping opacity-75"></div>
  </motion.div>
);

export const MapSection = () => {
  // Generate some random markers to simulate global activity
  const markers = useMemo(() => [
    { top: '30%', left: '20%', delay: 0 },
    { top: '45%', left: '25%', delay: 1.2 },
    { top: '25%', left: '48%', delay: 0.5 },
    { top: '65%', left: '32%', delay: 2.1 },
    { top: '50%', left: '60%', delay: 0.8 },
    { top: '35%', left: '65%', delay: 1.5 },
    { top: '20%', left: '75%', delay: 0.3 },
    { top: '70%', left: '80%', delay: 1.8 },
    { top: '55%', left: '85%', delay: 0.9 },
    { top: '40%', left: '45%', delay: 2.5 },
  ], []);

  return (
    <section id="global" className="py-24 bg-zinc-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
      
      <Container size="lg" className="relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            A Thriving Global Ecosystem
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="text-lg text-zinc-400"
          >
            Join thousands of farmers worldwide securely growing their yields across multiple regions.
          </motion.p>
        </div>

        <div className="relative w-full max-w-4xl mx-auto aspect-[2/1] bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm overflow-hidden flex items-center justify-center p-8">
          {/* Abstract SVG Map Representation */}
          <svg viewBox="0 0 1000 500" className="w-full h-full opacity-20 text-harvest-green-200" fill="currentColor">
            <path d="M150,150 Q200,100 250,150 T350,150 T450,200 T550,150 T650,250 T750,200 T850,250 Q900,300 850,350 T750,400 T650,350 T550,450 T450,400 T350,450 T250,400 T150,450 Q100,400 150,350 T50,250 T150,150 Z" stroke="currentColor" strokeWidth="2" fill="none" className="opacity-50" />
            <path d="M200,200 Q250,150 300,200 T400,200 T500,250 T600,200 T700,300 T800,250 Q850,300 800,350 T700,350 T600,400 T500,350 T400,400 T300,350 Q250,350 200,300 T200,200 Z" opacity="0.5" />
          </svg>
          
          {/* Glowing Markers */}
          {markers.map((marker, i) => (
            <Marker key={i} top={marker.top} left={marker.left} delay={marker.delay} />
          ))}

          {/* Stats Overlay */}
          <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-auto flex max-md:flex-col gap-4 md:gap-12 bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">$2.4B+</div>
              <div className="text-xs text-harvest-green-400 uppercase tracking-widest">Total Value Locked</div>
            </div>
            <div className="hidden md:block w-px bg-white/10"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">145k+</div>
              <div className="text-xs text-harvest-green-400 uppercase tracking-widest">Active Farmers</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
