'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

interface PaymentStatus {
  payment_id: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  tariff: { id: number; name: string; price: string };
  phone_masked: string;
  seconds_until_resend: number;
  attempts_left: number;
}

interface VerifyResponse {
  success: boolean;
  tariff_name?: string;
  nano_granted?: number;
  tokens_granted?: number;
  new_balance?: number;
  nano_coins?: number;
  message?: string;
  error?: string;
  attempts_left?: number;
}

const CODE_LENGTH = 6;

export default function VerifyPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;
  const router = useRouter();
  const t = useTranslations('VerifySms');
  const { isAuthenticated, updateBalance } = useAuthStore();

  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // Qayta yuborish taymeri (realtime countdown)
  const [resendIn, setResendIn] = useState(60);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Payment holatini olish
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    api.get<PaymentStatus>(`/payments/${paymentId}/status/`)
      .then((res) => {
        setPayment(res.data);
        setResendIn(res.data.seconds_until_resend);
        if (res.data.status === 'SUCCESS') {
          router.replace('/profile');
        }
      })
      .catch(() => setError(t('paymentNotFound')))
      .finally(() => setLoading(false));
  }, [paymentId, isAuthenticated, router, t]);

  // Realtime countdown — har sekundda 1 dan kamayadi
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  // Birinchi input'ga avtomatik fokus
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setError('');

    if (v && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    // Barcha 6 xona to'lsa — avtomatik yuborish
    if (v && index === CODE_LENGTH - 1 && next.every((d) => d)) {
      void handleVerify(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      e.preventDefault();
      setDigits(pasted.split(''));
      void handleVerify(pasted);
    }
  };

  const handleVerify = async (code?: string) => {
    const finalCode = code ?? digits.join('');
    if (finalCode.length !== CODE_LENGTH) {
      setError(t('enterFullCode'));
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      const res = await api.post<VerifyResponse>('/payments/verify/', {
        payment_id: Number(paymentId),
        code: finalCode,
      });
      if (res.data.success) {
        // Balansni darhol yangilaymiz
        if (typeof res.data.new_balance === 'number') {
          updateBalance(res.data.new_balance, res.data.nano_coins ?? 0);
        }
        setSuccess(true);
        // 1.5 sekunddan keyin profilga o'tamiz
        setTimeout(() => router.replace('/profile'), 1500);
      } else {
        setError(res.data.error ?? t('wrongCode'));
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: VerifyResponse } };
      const data = axiosErr.response?.data;
      const left = data?.attempts_left;
      setError(
        (data?.error ?? t('wrongCode')) +
        (typeof left === 'number' ? ' ' + t('attemptsLeft', { count: left }) : ''),
      );
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || isResending) return;
    setIsResending(true);
    setError('');
    try {
      const res = await api.post<{ success: boolean; resend_after: number; error?: string }>(
        '/payments/resend/',
        { payment_id: Number(paymentId) },
      );
      if (res.data.success) {
        setResendIn(res.data.resend_after ?? 60);
        setDigits(Array(CODE_LENGTH).fill(''));
        inputsRef.current[0]?.focus();
      } else {
        setError(res.data.error ?? t('resendError'));
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; retry_after?: number } } };
      const data = axiosErr.response?.data;
      if (data?.retry_after) setResendIn(data.retry_after);
      setError(data?.error ?? t('resendError'));
    } finally {
      setIsResending(false);
    }
  };

  // ── Rendering ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || t('paymentNotFound')}</p>
          <Button onClick={() => router.push('/pricing')}>{t('backToPricing')}</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-2">{t('successTitle')}</h2>
          <p className="text-zinc-400 mb-6">{t('successDesc', { tariff: payment.tariff.name })}</p>
          <p className="text-xs text-zinc-500">{t('redirecting')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('title')}</h2>
              <p className="text-xs text-zinc-400">
                {t('sentTo', { phone: payment.phone_masked })}
              </p>
            </div>
          </div>

          {/* 6 ta xona input */}
          <div className="flex justify-between gap-2 mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isVerifying}
                className="w-12 h-14 text-center text-2xl font-bold bg-zinc-900 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <div className="px-4 py-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            onClick={() => void handleVerify()}
            disabled={isVerifying || digits.some((d) => !d)}
            className="w-full py-6 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-70">
            {isVerifying
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t('verifying')}</>
              : t('verify')}
          </Button>

          {/* Resend — realtime countdown */}
          <div className="mt-6 text-center">
            {resendIn > 0 ? (
              <p className="text-sm text-zinc-500">
                {t('resendIn')}: <span className="font-mono text-zinc-300">0:{String(resendIn).padStart(2, '0')}</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50">
                {isResending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('resending')}</>
                  : <><RefreshCw className="w-3.5 h-3.5" /> {t('resendNow')}</>}
              </button>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[11px] text-zinc-500">
          {t('codeNotReceived')}
        </p>
      </div>
    </div>
  );
}
