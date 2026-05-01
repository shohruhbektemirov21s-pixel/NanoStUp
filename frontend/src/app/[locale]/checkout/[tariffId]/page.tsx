'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Check, CreditCard, ExternalLink, Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatUzsPrice } from '@/shared/utils/currency';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

interface Tariff {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  features: string[];
  nano_coins_included?: number;
}

interface CheckoutResponse {
  success: boolean;
  payment_id: number;
  provider: string;
  provider_label: string;
  checkout_url: string;
  error?: string;
}

// Faqat WLCM — agregator orqali Payme/Click/Uzum/Paylov/Karta to'lovlari
const PAYMENT_PROVIDER_ID = 'wlcm' as const;

export default function CheckoutPage() {
  const params = useParams<{ tariffId: string }>();
  const tariffId = params.tariffId;
  const router = useRouter();
  const t = useTranslations('Checkout');
  const tp = useTranslations('Pricing');
  const { isAuthenticated } = useAuthStore();

  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [loadingTariff, setLoadingTariff] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    api.get<Tariff>(`/subscriptions/tariffs/${tariffId}/`)
      .then((res) => setTariff(res.data))
      .catch(() => setError(t('tariffNotFound')))
      .finally(() => setLoadingTariff(false));
  }, [tariffId, isAuthenticated, router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await api.post<CheckoutResponse>('/payments/checkout/', {
        tariff_id: Number(tariffId),
        provider: PAYMENT_PROVIDER_ID,
      });
      if (res.data.success && res.data.checkout_url) {
        // WLCM to'lov sahifasiga o'tamiz
        window.location.href = res.data.checkout_url;
      } else {
        setError(res.data.error ?? t('initiateError'));
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error ?? t('initiateError'));
      setIsSubmitting(false);
    }
  };

  if (loadingTariff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!tariff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || t('tariffNotFound')}</p>
          <Button onClick={() => router.push('/pricing')}>{t('back')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/pricing')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('backToPricing')}
        </button>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Tarif xulosa */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-2 p-6 rounded-3xl border border-white/10 bg-white/5 h-fit">
            <h3 className="text-sm text-zinc-400 mb-1">{t('selectedPlan')}</h3>
            <h2 className="text-2xl font-bold mb-4">{tariff.name}</h2>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black">
                {formatUzsPrice(tariff.price, tp('currency'), tp('free'))}
              </span>
            </div>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{tariff.description}</p>

            <div className="space-y-3 pt-6 border-t border-white/10">
              {tariff.features?.slice(0, 5).map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  <span className="text-zinc-300">{f}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* To'lov formasi */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-3 p-6 rounded-3xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('confirmPayment')}</h2>
                <p className="text-xs text-zinc-400">Xavfsiz to&apos;lov — WLCM orqali</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* WLCM — yagona to'lov tizimi (Payme/Click/Uzum/Karta agregatori) */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-3">
                  To&apos;lov tizimi
                </label>
                <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-black text-xl shrink-0">
                    W
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-base">WLCM</div>
                    <div className="text-xs text-zinc-400">
                      Payme · Click · Uzum · Paylov · Bank kartasi
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
                  Bitta oynada barcha asosiy to&apos;lov usullari — kartangiz yoki hamyoningizga qarab tanlang.
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-70">
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('submitting')}</>
                ) : (
                  <>
                    {formatUzsPrice(tariff.price, tp('currency'), tp('free'))} — To&apos;lashga o&apos;tish
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500 justify-center pt-2">
                <Shield className="w-3.5 h-3.5" />
                <span>{t('secureSsl')}</span>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
