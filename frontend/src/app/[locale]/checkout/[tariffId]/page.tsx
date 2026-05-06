'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, CreditCard, Loader2, Send, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatUzsPrice } from '@/shared/utils/currency';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

// ── Manual to'lov rekvizitlari ───────────────────────────────────
// Avtomatik to'lov tizimi (WLCM/Payme/Click) hozircha o'chirilgan.
// Foydalanuvchi kartaga pul o'tkazib, chekni Telegram orqali yuboradi.
const MANUAL_CARD_NUMBER = '5614 6814 2538 9388';
const MANUAL_CARD_HOLDER = 'Temirov Shohruh';
const MANUAL_TELEGRAM = 'shohruhbek_2102';

interface Tariff {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  features: string[];
  nano_coins_included?: number;
}

export default function CheckoutPage() {
  const params = useParams<{ tariffId: string }>();
  const tariffId = params.tariffId;
  const router = useRouter();
  const t = useTranslations('Checkout');
  const tp = useTranslations('Pricing');
  const { isAuthenticated } = useAuthStore();

  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [loadingTariff, setLoadingTariff] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'card' | 'tg' | null>(null);

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

  const copy = async (text: string, kind: 'card' | 'tg') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard API yo'q (eski brauzer) — sukutda qoldiramiz
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

          {/* To'lov ko'rsatmalari (manual transfer) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-3 p-6 rounded-3xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">To&apos;lov ko&apos;rsatmalari</h2>
                <p className="text-xs text-zinc-400">Kartaga o&apos;tkazib, chekni Telegram&apos;ga yuboring</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* 1) Karta raqami */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  1. Karta raqami (Humo)
                </label>
                <button
                  type="button"
                  onClick={() => copy(MANUAL_CARD_NUMBER.replace(/\s/g, ''), 'card')}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left">
                  <div className="min-w-0">
                    <div className="text-lg font-mono font-bold tracking-wider text-white">
                      {MANUAL_CARD_NUMBER}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Egasi: <span className="text-zinc-200 font-semibold">{MANUAL_CARD_HOLDER}</span>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-200 text-xs font-semibold">
                    {copied === 'card' ? (
                      <><Check className="w-3.5 h-3.5" /> Nusxalandi</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Nusxalash</>
                    )}
                  </span>
                </button>
              </div>

              {/* 2) Summa */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  2. Aniq summani o&apos;tkazing
                </label>
                <div className="px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="text-2xl font-black text-emerald-400">
                    {formatUzsPrice(tariff.price, tp('currency'), tp('free'))}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    To&apos;liq summani bitta to&apos;lovda yuboring.
                  </p>
                </div>
              </div>

              {/* 3) Telegram'ga chek */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  3. Chek va profil nomini Telegram&apos;ga yuboring
                </label>
                <a
                  href={`https://t.me/${MANUAL_TELEGRAM}`}
                  target="_blank" rel="noreferrer"
                  className="block">
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-base text-white">@{MANUAL_TELEGRAM}</div>
                      <div className="text-[11px] text-zinc-400">
                        Chekni va NanoStUp profil nomingizni yuboring
                      </div>
                    </div>
                    <span className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold whitespace-nowrap">
                      Ochish →
                    </span>
                  </div>
                </a>
                <button
                  type="button"
                  onClick={() => copy(`@${MANUAL_TELEGRAM}`, 'tg')}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 transition-colors">
                  {copied === 'tg' ? (
                    <><Check className="w-3.5 h-3.5" /> Telegram username nusxalandi</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Telegram username&apos;ni nusxalash</>
                  )}
                </button>
              </div>

              {/* Eslatma */}
              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                ⏱️ Tasdiqlangach, sizning {tariff.name} tarifingiz <b>15 daqiqa ichida</b> faollashtiriladi.
                Savollar bo&apos;lsa Telegram&apos;ga yozing.
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={() => window.open(`https://t.me/${MANUAL_TELEGRAM}`, '_blank')}
                className="w-full py-6 rounded-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white">
                <Send className="w-4 h-4 mr-2" />
                Telegram&apos;ga chek yuborish
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500 justify-center pt-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Xavfsiz to&apos;lov — qo&apos;lda tasdiqlash</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
