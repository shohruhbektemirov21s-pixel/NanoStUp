'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

export function PremiumNavbar() {
  const t = useTranslations('Navbar');
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.8)"]
  );
  
  const borderBottom = useTransform(
    scrollY,
    [0, 50],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.1)"]
  );

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', updateScrolled);
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  return (
    <motion.nav
      style={{ backgroundColor, borderBottom }}
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-xl h-20 flex items-center"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            AI Builder
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-10">
          {[
            { name: t('features'), href: '#features' },
            { name: t('pricing'), href: '#pricing' },
            { name: t('showcase'), href: '#showcase' }
          ].map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              {t('login')}
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-zinc-200 rounded-2xl h-11 px-6 font-bold shadow-xl shadow-white/10 active:scale-95 transition-all">
                {t('getStarted')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
