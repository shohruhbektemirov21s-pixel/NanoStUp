'use client';

import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/store/authStore';
import api from '@/shared/api/axios';
import { formatUzsPrice } from '@/shared/utils/currency';

interface Tariff {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  projects_limit: number;
  ai_generations_limit: number;
  features: string[];
  is_active?: boolean;
}

// Fallback — API ishlamasa ko'rinadigan statik ma'lumot
const FALLBACK_TIERS = [
  {
    id: 0,
    name: 'Bepul',
    description: 'Sinab ko\'rish uchun',
    price: '0',
    duration_days: 0,
    projects_limit: 1,
    ai_generations_limit: 5,
    features: ['1 ta loyiha', '5 ta AI generatsiya', 'Asosiy qo\'llab-quvvatlash'],
  },
  {
    id: -1,
    name: 'Pro',
    description: 'Biznes va ijodkorlar uchun',
    price: '199000',
    duration_days: 30,
    projects_limit: 10,
    ai_generations_limit: 100,
    features: ['10 ta loyiha', '100 ta AI generatsiya', 'ZIP eksport', 'Ustuvor qo\'llab-quvvatlash'],
  },
];

function isPopular(tariff: Tariff, all: Tariff[]) {
  if (all.length <= 1) return false;
  const sorted = [...all].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  // Eng qimmat emas, lekin bepul ham emas — o'rtadagi
  const mid = sorted[Math.floor(sorted.length / 2)];
  return mid?.id === tariff.id;
}

export default function PricingPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations('Pricing');
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    api.get<Tariff[]>('/subscriptions/tariffs/')
      .then((res) => setTariffs(res.data.filter((tf) => tf.is_active !== false)))
      .catch(() => setTariffs(FALLBACK_TIERS))
      .finally(() => setLoading(false));
  }, []);

  const displayTariffs = tariffs.length > 0 ? tariffs : FALLBACK_TIERS;

  const handleSelectPlan = (tariff: Tariff) => {
    if (parseFloat(tariff.price) === 0) {
      // Bepul reja — ro'yxatdan o'tish kifoya
      router.push(isAuthenticated ? '/profile' : '/register');
      return;
    }
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(`/checkout/${tariff.id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className={`grid gap-8 ${displayTariffs.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
            {displayTariffs.map((tier, i) => {
              const popular = isPopular(tier, displayTariffs);
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-8 rounded-3xl border flex flex-col ${
                    popular
                      ? 'border-purple-500 bg-purple-500/5'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                      <Sparkles className="w-3 h-3" /> {t('mostPopular')}
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {formatUzsPrice(tier.price, t('currency'), t('free'))}
                      </span>
                    </div>
                    {tier.duration_days > 0 && (
                      <p className="mt-1 text-xs text-gray-500">{t('daysSubscription', { days: tier.duration_days })}</p>
                    )}
                    <p className="mt-4 text-gray-400 text-sm leading-relaxed">{tier.description}</p>
                  </div>

                  <div className="space-y-3 mb-10 flex-1">
                    {tier.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-green-500" />
                        </div>
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(tier)}
                    className={`w-full py-6 rounded-2xl font-bold transition-all ${
                      popular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    {parseFloat(tier.price) === 0 ? t('startFree') : t('choose')}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
