'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Coins, History, LogOut, Menu, Settings, Sparkles, User, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function PremiumNavbar() {
  const t = useTranslations('Navbar');
  const tProfile = useTranslations('Profile');
  const tHistory = useTranslations('History');
  const tPricing = useTranslations('Pricing');
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useEffect(() => { setMounted(true); }, []);

  // Tashqi bosilganda dropdown yopilsin
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // Mobil menyu ochiqda scroll o'chirilsin
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
  };

  // Anchor smooth scroll
  const handleAnchorClick = (sectionId: string) => {
    setMobileOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const tokens = user?.tokens_balance ?? 0;
  const nano = user?.nano_coins ?? Math.floor(tokens / 10);
  const initials = (user?.full_name || user?.email || '?').slice(0, 1).toUpperCase();

  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.85)']
  );
  const borderBottom = useTransform(
    scrollY,
    [0, 50],
    ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.08)']
  );

  const navLinks = [
    { name: t('features'), id: 'features' },
    { name: t('pricing'), id: 'pricing' },
    { name: t('showcase'), id: 'showcase' },
  ];

  return (
    <>
      <motion.nav
        style={{ backgroundColor, borderBottom }}
        className={cn(
          'fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-xl h-20 flex items-center'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              NanoStUp
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAnchorClick(item.id)}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group cursor-pointer"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Auth'siz (desktop) */}
            {mounted && !isAuthenticated && (
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
            )}

            {/* Auth bo'lgan user */}
            {mounted && isAuthenticated && user && (
              <div className="flex items-center gap-3" ref={menuRef}>
                {/* Balans */}
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 px-3 h-10 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl hover:from-amber-500/20 hover:to-orange-500/20 transition-all"
                >
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-200">
                    {nano.toLocaleString('en')} <span className="text-[10px] text-amber-400/80 font-semibold">nano</span>
                  </span>
                </Link>

                {/* Builder */}
                <Link href="/builder" className="hidden sm:block">
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl h-11 px-5 font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
                    <Sparkles className="w-4 h-4 mr-1" /> Builder
                  </Button>
                </Link>

                {/* Avatar dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black border-2 border-white/20 hover:border-white/40 transition-all"
                  >
                    {initials}
                  </button>

                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10">
                        <p className="font-bold text-white truncate">{user.full_name || user.email}</p>
                        <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                        <div className="mt-3 flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <span className="text-xs text-amber-200/80">{tProfile('tokens')}</span>
                          <span className="text-sm font-black text-amber-300">{tokens.toLocaleString('en')}</span>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link href="/profile" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                          <User className="w-4 h-4" /> {tProfile('title')}
                        </Link>
                        <Link href="/history" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                          <History className="w-4 h-4" /> {tHistory('title')}
                        </Link>
                        <Link href="/pricing" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                          <Settings className="w-4 h-4" /> {tPricing('choose')}
                        </Link>
                      </div>
                      <div className="py-2 border-t border-white/10">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> {tProfile('logout')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Mobil burger */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobil full-screen menyu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-black/97 backdrop-blur-2xl flex flex-col pt-24 px-6 pb-10"
          >
            {/* Nav links */}
            <div className="flex flex-col gap-1 mb-8">
              {navLinks.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleAnchorClick(item.id)}
                  className="text-left text-3xl font-black text-white py-5 border-b border-white/5 hover:text-purple-400 transition-colors"
                >
                  {item.name}
                </motion.button>
              ))}
            </div>

            {/* Auth bo'lmagan */}
            {mounted && !isAuthenticated && (
              <div className="flex flex-col gap-3 mt-auto">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full h-14 text-lg font-bold border-white/20 rounded-2xl">
                    {t('login')}
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl">
                    {t('getStarted')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Auth bo'lgan */}
            {mounted && isAuthenticated && user && (
              <div className="flex flex-col gap-3 mt-auto">
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black">
                    {initials}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{user.full_name || user.email}</p>
                    <p className="text-xs text-amber-400">{nano.toLocaleString('en')} nano</p>
                  </div>
                </div>
                <Link href="/builder" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl">
                    <Sparkles className="w-5 h-5 mr-2" /> Builder
                  </Button>
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full h-12 font-semibold border-white/20 rounded-2xl">
                    {tProfile('title')}
                  </Button>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full h-12 rounded-2xl border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/10 transition-all"
                >
                  {tProfile('logout')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
