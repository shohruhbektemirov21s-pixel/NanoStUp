'use client';

import React from 'react';
import { motion } from 'framer-motion';
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

        {/* Showcase / CTA Section */}
        <section className="py-32 px-6 relative overflow-hidden" id="showcase">
           <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent -z-10" />
           <div className="max-w-7xl mx-auto">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="p-16 md:p-24 rounded-[3.5rem] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-white/10 relative overflow-hidden text-center"
             >
               <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] -z-10" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] -z-10" />
               
               <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                 Ready to launch <br /> 
                 <span className="text-zinc-500">your next big idea?</span>
               </h2>
               <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
                 Join thousands of entrepreneurs who built their professional websites using AI in minutes, not weeks.
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                 <button className="h-16 px-12 bg-white text-black hover:bg-zinc-200 rounded-2xl text-xl font-bold transition-all active:scale-95 shadow-2xl shadow-white/5">
                   Start Building for Free
                 </button>
               </div>
             </motion.div>
           </div>
        </section>
      </main>

      <PremiumFooter />
    </div>
  );
}
