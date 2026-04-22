import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { SiteRenderer } from '@/features/builder/SiteRenderer';

// ── Backend API (server-side fetch) ────────────────────────────
// Brauzer uchun NEXT_PUBLIC_API_URL mavjud; server uchun esa xohlasa
// BACKEND_INTERNAL_URL bilan override qilish mumkin (docker/prod uchun).
const API_BASE =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000/api';

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
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchPublicSite(slug);
  if (!site) return { title: 'Sayt topilmadi' };
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
  const { slug } = await params;
  const site = await fetchPublicSite(slug);
  if (!site || !site.schema_data) notFound();

  // SiteRenderer client-agnostic (oddiy JSX) — server'da ham ishlaydi
  return (
    <main className="w-full">
      <SiteRenderer schema={site.schema_data as Parameters<typeof SiteRenderer>[0]['schema']} />
      <footer className="py-6 px-6 text-center text-xs text-zinc-400 border-t border-zinc-100">
        AI yordamida yaratilgan · {new Date(site.updated_at).toLocaleDateString('uz-UZ')}
      </footer>
    </main>
  );
}
