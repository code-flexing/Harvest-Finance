import React from 'react';
import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { MapSection } from '@/components/landing/MapSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans selection:bg-harvest-green-200 selection:text-harvest-green-900">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <MapSection />
        <BenefitsSection />
      </main>
      <Footer />
    </div>
  );
}
