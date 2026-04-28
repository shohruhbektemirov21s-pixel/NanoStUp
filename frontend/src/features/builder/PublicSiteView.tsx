'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

import { SiteRenderer } from './SiteRenderer';

interface Props {
  schema: Parameters<typeof SiteRenderer>[0]['schema'];
  siteTitle: string;
  updatedAt: string;
  locale: string;
  generatedByLabel: string;
}

export function PublicSiteView({ schema, updatedAt, locale, generatedByLabel }: Props) {
  const localeMap: Record<string, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' };
  const dateStr = new Date(updatedAt).toLocaleDateString(localeMap[locale] ?? 'uz-UZ');

  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? '');
  const { isAuthenticated } = useAuthStore();
  const [isOwner, setIsOwner] = useState(false);

  // Owner ekanligini fonda tekshiramiz — agar shunday bo'lsa, "Admin" tugma chiqadi.
  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    let cancelled = false;
    api
      .get(`/projects/owner/by_slug/${encodeURIComponent(slug)}/`)
      .then((res) => {
        if (!cancelled && res.data?.success) setIsOwner(true);
      })
      .catch(() => {
        /* not owner — keep default false */
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, slug]);

  return (
    <main className="w-full relative">
      <SiteRenderer schema={schema} />
      {isOwner && (
        <a
          href={`/${locale}/site-admin/${slug}`}
          className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-full font-bold text-xs bg-amber-500 text-zinc-900 shadow-lg hover:bg-amber-400 transition flex items-center gap-2"
        >
          <span>⚙️</span> Admin panel
        </a>
      )}
      <div className="py-4 px-6 text-center text-[11px] text-zinc-400 border-t border-zinc-100">
        {generatedByLabel} · {dateStr} · <Link href="/" className="hover:text-zinc-600 transition-colors">NanoStUp AI</Link>
      </div>
    </main>
  );
}
