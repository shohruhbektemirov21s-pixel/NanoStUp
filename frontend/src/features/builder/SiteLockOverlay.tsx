'use client';

import Link from 'next/link';
import { Lock, AlertTriangle, Archive, Sparkles, Clock, ArrowRight, Mail } from 'lucide-react';

import type { LockInfo } from '@/app/[locale]/s/[slug]/page';

interface Props {
  siteTitle: string;
  lockInfo: LockInfo;
  locale: string;
}

const STATUS_CONFIG = {
  EXPIRED: {
    Icon: Clock,
    accent: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-300',
    cta: '/pricing',
  },
  SUSPENDED: {
    Icon: AlertTriangle,
    accent: 'from-red-500 to-rose-600',
    badgeBg: 'bg-red-500/10',
    badgeBorder: 'border-red-500/30',
    badgeText: 'text-red-300',
    cta: 'mailto:support@nanostup.uz',
  },
  ARCHIVED: {
    Icon: Archive,
    accent: 'from-zinc-500 to-zinc-700',
    badgeBg: 'bg-zinc-500/10',
    badgeBorder: 'border-zinc-500/30',
    badgeText: 'text-zinc-300',
    cta: '/',
  },
} as const;

const labels = {
  uz: { back: 'Bosh sahifaga', poweredBy: 'NanoStUp AI' },
  ru: { back: 'На главную', poweredBy: 'NanoStUp AI' },
  en: { back: 'Back to home', poweredBy: 'NanoStUp AI' },
};

export function SiteLockOverlay({ siteTitle, lockInfo, locale }: Props) {
  const cfg = STATUS_CONFIG[lockInfo.status] || STATUS_CONFIG.EXPIRED;
  const { Icon } = cfg;
  const lng = (locale === 'ru' || locale === 'en') ? locale : 'uz';
  const lbl = labels[lng];

  const isMail = cfg.cta.startsWith('mailto:');

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-hidden flex items-center justify-center px-4 py-16">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 -z-10">
        <div
          className={`absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 bg-gradient-to-br ${cfg.accent}`}
        />
        <div
          className={`absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 bg-gradient-to-br ${cfg.accent}`}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative max-w-2xl w-full">
        {/* Status badge */}
        <div className="flex justify-center mb-8">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${cfg.badgeBg} ${cfg.badgeBorder} border ${cfg.badgeText} text-xs font-semibold tracking-wider uppercase`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lockInfo.status}</span>
          </div>
        </div>

        {/* Lock icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${cfg.accent} flex items-center justify-center shadow-2xl shadow-black/50`}
            >
              <Icon className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
            <div
              className={`absolute -inset-3 rounded-3xl bg-gradient-to-br ${cfg.accent} blur-2xl opacity-30 -z-10`}
            />
          </div>
        </div>

        {/* Site title */}
        <p className="text-center text-zinc-400 text-sm mb-2 truncate">
          {siteTitle}
        </p>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-center mb-4 tracking-tight">
          {lockInfo.title}
        </h1>

        {/* Description */}
        <p className="text-center text-zinc-300 text-base md:text-lg mb-8 max-w-md mx-auto leading-relaxed">
          {lockInfo.description}
        </p>

        {/* Days info (only for EXPIRED) */}
        {lockInfo.status === 'EXPIRED' && lockInfo.expires_at && (
          <div className="flex justify-center mb-8">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400">
              {lng === 'ru' ? 'Истёк' : lng === 'en' ? 'Expired' : 'Tugagan'}:{' '}
              <span className="text-white font-medium">
                {new Date(lockInfo.expires_at).toLocaleDateString(
                  lng === 'ru' ? 'ru-RU' : lng === 'en' ? 'en-US' : 'uz-UZ',
                )}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isMail ? (
            <a
              href={cfg.cta}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r ${cfg.accent} text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all`}
            >
              <Mail className="w-4 h-4" />
              {lockInfo.cta}
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <Link
              href={`/${lng}${cfg.cta}`}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r ${cfg.accent} text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all`}
            >
              <Sparkles className="w-4 h-4" />
              {lockInfo.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href={`/${lng}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-sm transition-all"
          >
            {lbl.back}
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link
            href={`/${lng}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>{lbl.poweredBy}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
