import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PublicSiteView } from '@/features/builder/PublicSiteView';

// ── Backend API (server-side fetch) ────────────────────────────
// Brauzer uchun NEXT_PUBLIC_API_URL mavjud; server uchun esa xohlasa
// BACKEND_INTERNAL_URL bilan override qilish mumkin (docker/prod uchun).
// BACKEND_INTERNAL_URL: "https://nanostup-api.onrender.com/api" (render.yaml)
// NEXT_PUBLIC_API_URL:   "https://nanostup-api.onrender.com"     (no /api suffix)
// fallback:              "http://127.0.0.1:8000/api"
const _rawBase =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000/api';
// Normalize: ensure exactly one /api suffix
const API_BASE = _rawBase.replace(/\/api\/?$/, '') + '/api';

export interface LockInfo {
  status: 'EXPIRED' | 'SUSPENDED' | 'ARCHIVED';
  title: string;
  description: string;
  cta: string;
  days_until_expiry: number | null;
  expires_at: string | null;
}

interface PublicSiteResponse {
  success: boolean;
  locked?: boolean;
  site?: {
    title: string;
    schema_data?: Record<string, unknown> | null;
    language: string;
    slug: string;
    view_count?: number;
    updated_at: string;
    hosting_status?: string;
    needs_renewal_soon?: boolean;
    days_until_expiry?: number | null;
  };
  lock_info?: LockInfo;
  error?: string;
}

async function fetchPublicSite(slug: string): Promise<PublicSiteResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/public/sites/${encodeURIComponent(slug)}/`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: PublicSiteResponse = await res.json();
    return data;
  } catch {
    return null;
  }
}

// ── Dynamic metadata: OG / Twitter ─────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; locale: string }> },
): Promise<Metadata> {
  const { slug, locale } = await params;
  const data = await fetchPublicSite(slug);
  const t = await getTranslations({ locale, namespace: 'PublicSite' });
  if (!data || !data.site) return { title: t('notFound') };
  const title = data.site.title || 'AI Sayt';
  const description = `${title} — AI yordamida yaratilgan sayt.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// ── Page ───────────────────────────────────────────────────────

export default async function PublicSitePage(
  { params }: { params: Promise<{ slug: string; locale: string }> },
) {
  const { slug, locale } = await params;
  const data = await fetchPublicSite(slug);
  if (!data || !data.site) notFound();

  const t = await getTranslations({ locale, namespace: 'PublicSite' });

  // SaaS soft-lock: agar sayt EXPIRED/SUSPENDED bo'lsa overlay ko'rsatamiz
  if (data.locked && data.lock_info) {
    const { SiteLockOverlay } = await import('@/features/builder/SiteLockOverlay');
    return (
      <SiteLockOverlay
        siteTitle={data.site.title || 'AI Sayt'}
        lockInfo={data.lock_info}
        locale={locale}
      />
    );
  }

  if (!data.site.schema_data) notFound();

  return (
    <PublicSiteView
      schema={data.site.schema_data as Parameters<typeof PublicSiteView>[0]['schema']}
      siteTitle={data.site.title || 'AI Sayt'}
      updatedAt={data.site.updated_at}
      locale={locale}
      generatedByLabel={t('generatedBy')}
      needsRenewalSoon={data.site.needs_renewal_soon}
      daysUntilExpiry={data.site.days_until_expiry ?? null}
    />
  );
}
