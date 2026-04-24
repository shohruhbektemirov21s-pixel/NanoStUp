'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const t = useTranslations('Auth');
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/accounts/register/', { 
        email, 
        password, 
        full_name: fullName 
      });

      // Auto login
      const loginResponse = await api.post('/accounts/login/', { email, password });
      const { access } = loginResponse.data;
      
      const userResponse = await api.get('/accounts/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      
      setAuth(userResponse.data, access);
      router.push('/builder');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as Record<string, unknown> | undefined;
        setError(Object.values(payload || {}).join(' ') || err.message || t('registerFailed'));
      } else {
        setError(t('registerFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{t('backHome')}</span>
      </Link>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">{t('registerTitle')}</h1>
          <p className="text-gray-500 mt-2">{t('registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">{t('fullName')}</label>
            <input 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">{t('email')}</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1.5 block">{t('password')}</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button 
            disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('createAccount')}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          {t('haveAccount')} {' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">{t('login')}</Link>
        </p>
      </motion.div>
    </div>
  );
}
