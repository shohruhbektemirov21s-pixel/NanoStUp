import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PublicSiteGuard } from '@/features/builder/PublicSiteGuard';

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

interface PublicSiteResponse {
  success: boolean;
  site?: {
    title: string;
    schema_data: Record<string, unknown> | null;
    language: string;
    slug: string;
    view_count: number;
    updated_at: string;
  };
  error?: string;
}

async function fetchPublicSite(slug: string): Promise<PublicSiteResponse['site'] | null> {
  try {
    const res = await fetch(`${API_BASE}/public/sites/${encodeURIComponent(slug)}/`, {
      // Har so'rovda view_count inkrement bo'lishi uchun cache yo'q
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: PublicSiteResponse = await res.json();
    return data.site ?? null;
  } catch {
    return null;
  }
}

// ── Dynamic metadata: OG / Twitter ─────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; locale: string }> },
): Promise<Metadata> {
  const { slug, locale } = await params;
  const site = await fetchPublicSite(slug);
  const t = await getTranslations({ locale, namespace: 'PublicSite' });
  if (!site) return { title: t('notFound') };
  const title = site.title || 'AI Sayt';
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
  const site = await fetchPublicSite(slug);
  if (!site || !site.schema_data) notFound();

  const t = await getTranslations({ locale, namespace: 'PublicSite' });

  return (
    <PublicSiteGuard
      schema={site.schema_data as Parameters<typeof PublicSiteGuard>[0]['schema']}
      siteTitle={site.title || 'AI Sayt'}
      updatedAt={site.updated_at}
      locale={locale}
      generatedByLabel={t('generatedBy')}
    />
  );
}
