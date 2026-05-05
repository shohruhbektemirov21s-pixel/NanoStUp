'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

export function PremiumHero() {
  const t = useTranslations('Hero');

  return (
    <section className="relative pt-28 md:pt-40 pb-20 md:pb-32 px-4 md:px-6 overflow-hidden min-h-[90vh] flex items-center">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 bg-black">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center text-center">
          {t('badge') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold tracking-wide uppercase"
            >
              {t('badge')}
            </motion.div>
          )}
          <motion.h1

            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 md:mb-8 leading-[1.05]"
          >
            {t('titlePrefix')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 animate-gradient">
              {t('titleSuffix')}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-zinc-400 text-base sm:text-lg md:text-2xl max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed font-medium"
          >
            {t('description')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full"
          >
            <Link href="/builder" className="w-full sm:w-auto">
              <Button size="lg" className="h-14 md:h-16 px-6 md:px-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl md:rounded-3xl text-base md:text-xl font-bold group shadow-2xl shadow-purple-500/30 active:scale-95 transition-all w-full sm:w-auto">
                {t('startBuilding')}
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
