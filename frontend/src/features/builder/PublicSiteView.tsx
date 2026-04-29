'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Settings, AlertCircle, X } from 'lucide-react';

import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

import { SiteRenderer } from './SiteRenderer';

interface Props {
  schema: Parameters<typeof SiteRenderer>[0]['schema'];
  siteTitle: string;
  updatedAt: string;
  locale: string;
  generatedByLabel: string;
  needsRenewalSoon?: boolean;
  daysUntilExpiry?: number | null;
}

export function PublicSiteView({
  schema,
  updatedAt,
  locale,
  generatedByLabel,
  needsRenewalSoon,
  daysUntilExpiry,
}: Props) {
  const localeMap: Record<string, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' };
  const dateStr = new Date(updatedAt).toLocaleDateString(localeMap[locale] ?? 'uz-UZ');

  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? '');
  const { isAuthenticated } = useAuthStore();
  const [isOwner, setIsOwner] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    let cancelled = false;
    api
      .get(`/projects/owner/by_slug/${encodeURIComponent(slug)}/`)
      .then((res) => {
        if (!cancelled && res.data?.success) setIsOwner(true);
      })
      .catch(() => { /* not owner */ });
    return () => { cancelled = true; };
  }, [isAuthenticated, slug]);

  const showRenewBanner = isOwner && needsRenewalSoon && !bannerHidden;

  // Renewal banner matnlari
  const renewLabels: Record<string, { msg: (d: number) => string; cta: string }> = {
    uz: {
      msg: (d) => d === 0
        ? 'Hosting muddati bugun tugaydi!'
        : `Hosting muddati ${d} kun ichida tugaydi`,
      cta: 'Yangilash',
    },
    ru: {
      msg: (d) => d === 0
        ? 'Срок хостинга истекает сегодня!'
        : `Хостинг истекает через ${d} дн.`,
      cta: 'Обновить',
    },
    en: {
      msg: (d) => d === 0
        ? 'Hosting expires today!'
        : `Hosting expires in ${d} day${d === 1 ? '' : 's'}`,
      cta: 'Renew',
    },
  };
  const lng = (locale === 'ru' || locale === 'en') ? locale : 'uz';
  const rLbl = renewLabels[lng];

  return (
    <main className="w-full relative">
      <SiteRenderer schema={schema} />

      {/* Renewal banner (faqat owner uchun) */}
      {showRenewBanner && daysUntilExpiry !== null && daysUntilExpiry !== undefined && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500 text-zinc-900 shadow-2xl border border-amber-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold flex-1 truncate">
              {rLbl.msg(daysUntilExpiry)}
            </span>
            <Link
              href={`/${lng}/pricing`}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition whitespace-nowrap"
            >
              {rLbl.cta}
            </Link>
            <button
              onClick={() => setBannerHidden(true)}
              className="text-zinc-700 hover:text-zinc-900 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Owner admin button */}
      {isOwner && (
        <a
          href={`/${locale}/site-admin/${slug}`}
          className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-full font-bold text-xs bg-amber-500 text-zinc-900 shadow-lg hover:bg-amber-400 transition flex items-center gap-2"
        >
          <Settings className="w-3.5 h-3.5" /> Admin panel
        </a>
      )}

      <div className="py-4 px-6 text-center text-[11px] text-zinc-400 border-t border-zinc-100">
        {generatedByLabel} · {dateStr} ·{' '}
        <Link href="/" className="hover:text-zinc-600 transition-colors">NanoStUp AI</Link>
      </div>
    </main>
  );
}
