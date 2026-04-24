'use client';

import React from 'react';
import { PremiumNavbar } from '@/components/premium/Navbar';
import { PremiumHero } from '@/components/premium/Hero';
import { PremiumStats } from '@/components/premium/Stats';
import { PremiumFeatures } from '@/components/premium/Features';
import { PremiumFooter } from '@/components/premium/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1">
      <PremiumNavbar />
      
      <main className="flex-1">
        <PremiumHero />
        
        <PremiumStats />
        
        <PremiumFeatures />

      </main>

      <PremiumFooter />
    </div>
  );
}
