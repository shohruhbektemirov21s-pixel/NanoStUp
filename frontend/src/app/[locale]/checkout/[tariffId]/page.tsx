'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Check, CreditCard, ExternalLink, Loader2, Phone, Shield } from 'lucide-react';
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

interface InitiateResponse {
  success: boolean;
  payment_id: number;
  resend_after: number;
  error?: string;
}

interface CheckoutResponse {
  success: boolean;
  payment_id: number;
  provider: string;
  provider_label: string;
  checkout_url: string;
  error?: string;
}

type Provider = 'payme' | 'click' | 'paynet' | 'sms';

const PROVIDERS: Array<{
  id: Provider;
  label: string;
  description: string;
  logoBg: string;
  logoText: string;
}> = [
  { id: 'payme', label: 'Payme', description: 'Karta yoki Payme hisob',
    logoBg: 'bg-[#00A4E4]', logoText: 'P' },
  { id: 'click', label: 'Click', description: 'Click ilovasi yoki karta',
    logoBg: 'bg-[#0DC1FE]', logoText: 'C' },
  { id: 'paynet', label: 'Paynet', description: 'Paynet terminali/ilovasi',
    logoBg: 'bg-[#FF4E50]', logoText: 'N' },
  { id: 'sms', label: 'SMS (Test)', description: 'Dev rejim — SMS kod orqali',
    logoBg: 'bg-zinc-700', logoText: 'S' },
];

export default function CheckoutPage() {
  const params = useParams<{ tariffId: string }>();
  const tariffId = params.tariffId;
  const router = useRouter();
  const t = useTranslations('Checkout');
  const tp = useTranslations('Pricing');
  const { isAuthenticated } = useAuthStore();

  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [loadingTariff, setLoadingTariff] = useState(true);
  const [phone, setPhone] = useState('+998 ');
  const [provider, setProvider] = useState<Provider>('payme');
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

  const handlePhoneChange = (v: string) => {
    // Faqat raqamlar va "+" ni qoldiramiz, boshida +998 bo'lishi kerak
    const cleaned = v.replace(/[^\d+\s]/g, '');
    setPhone(cleaned);
  };

  const normalizedPhone = phone.replace(/\s+/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // SMS test rejimi — telefon raqam kerak
    if (provider === 'sms') {
      if (normalizedPhone.length < 10) {
        setError(t('phoneInvalid'));
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await api.post<InitiateResponse>('/payments/initiate/', {
          tariff_id: Number(tariffId),
          phone: normalizedPhone,
        });
        if (res.data.success) {
          router.push(`/checkout/verify/${res.data.payment_id}`);
        } else {
          setError(res.data.error ?? t('initiateError'));
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error ?? t('initiateError'));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Real to'lov provayderi — Payme / Click / Paynet sahifasiga redirect
    setIsSubmitting(true);
    try {
      const res = await api.post<CheckoutResponse>('/payments/checkout/', {
        tariff_id: Number(tariffId),
        provider,
      });
      if (res.data.success && res.data.checkout_url) {
        // Tashqi to'lov sahifasiga o'tamiz
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
                <p className="text-xs text-zinc-400">To&apos;lov usulini tanlang</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Provayder tanlash */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-3">
                  To&apos;lov tizimi
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PROVIDERS.map((p) => {
                    const selected = provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                          selected
                            ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                            : 'border-white/10 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-900'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl ${p.logoBg} flex items-center justify-center text-white font-black text-lg shrink-0`}>
                          {p.logoText}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm">{p.label}</div>
                          <div className="text-[10px] text-zinc-500 line-clamp-1">{p.description}</div>
                        </div>
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Telefon raqam — faqat SMS test rejimi uchun */}
              {provider === 'sms' && (
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">
                    {t('phoneLabel')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      required={provider === 'sms'}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">{t('phoneHint')}</p>
                </div>
              )}

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
                ) : provider === 'sms' ? (
                  `${formatUzsPrice(tariff.price, tp('currency'), tp('free'))} — ${t('submitSendCode')}`
                ) : (
                  <>
                    {formatUzsPrice(tariff.price, tp('currency'), tp('free'))} — {PROVIDERS.find(p => p.id === provider)?.label} ga o&apos;tish
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
