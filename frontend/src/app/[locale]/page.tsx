'use client';

import React from 'react';
import { PremiumNavbar } from '@/components/premium/Navbar';
import { PremiumHero } from '@/components/premium/Hero';
import { PremiumStats } from '@/components/premium/Stats';
import { PremiumFeatures } from '@/components/premium/Features';
import { PremiumPricing } from '@/components/premium/Pricing';
import { PremiumFooter } from '@/components/premium/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1">
      <PremiumNavbar />
      
      <main className="flex-1">
        <PremiumHero />
        
        <PremiumStats />
        
        <PremiumFeatures />

        <PremiumPricing />

        {/* Showcase bo'limi */}
        <section id="showcase" className="py-32 px-6 relative bg-black">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Showcase</h2>
            <p className="text-zinc-500 text-xl font-medium mb-16">Coming soon — real websites built with NanoStUp AI</p>
            <div className="grid md:grid-cols-3 gap-6">
              {["Cafe Tashkent", "Portfolio Studio", "Medical Clinic"].map((name, i) => (
                <div
                  key={i}
                  className="relative h-64 rounded-3xl border border-white/10 bg-zinc-900/40 flex items-center justify-center overflow-hidden group hover:border-purple-500/40 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 group-hover:from-purple-600/10 group-hover:to-blue-600/10 transition-all" />
                  <div className="text-center z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">✨</span>
                    </div>
                    <p className="font-bold text-white">{name}</p>
                    <p className="text-xs text-zinc-500 mt-1">Generated with AI</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PremiumFooter />
    </div>
  );
}
