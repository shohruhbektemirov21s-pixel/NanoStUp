'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

interface OwnerSite {
  id: string;
  title: string;
  schema_data: Record<string, unknown> | null;
  language: string;
  slug: string;
  is_published: boolean;
  updated_at: string;
}

interface OwnerResponse {
  success: boolean;
  site?: OwnerSite;
  error?: string;
  message?: string;
}

export default function SiteAdminPage() {
  const params = useParams<{ slug: string; locale: string }>();
  const router = useRouter();
  const slug = String(params?.slug ?? '');
  const locale = String(params?.locale ?? 'uz');

  const { isAuthenticated, isTokenExpired } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [site, setSite] = useState<OwnerSite | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [schemaText, setSchemaText] = useState('');

  // ── Auth gate ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || isTokenExpired()) {
      router.replace(`/${locale}/auth/login?next=/${locale}/s/${slug}/admin`);
    }
  }, [isAuthenticated, isTokenExpired, locale, router, slug]);

  // ── Load site ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<OwnerResponse>(
          `/projects/owner/by_slug/${encodeURIComponent(slug)}/`,
        );
        if (cancelled) return;
        if (!res.data.success || !res.data.site) {
          setError(res.data.error ?? 'Sayt topilmadi.');
          return;
        }
        setSite(res.data.site);
        setTitleDraft(res.data.site.title ?? '');
        setSchemaText(JSON.stringify(res.data.site.schema_data ?? {}, null, 2));
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { error?: string } } };
        if (e.response?.status === 404) {
          setError('Sayt topilmadi yoki sizniki emas.');
        } else if (e.response?.status === 401) {
          router.replace(`/${locale}/auth/login?next=/${locale}/s/${slug}/admin`);
        } else {
          setError(e.response?.data?.error ?? 'Yuklashda xatolik.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, slug, locale, router]);

  // ── JSON validate ──────────────────────────────────────────
  const jsonError = useMemo(() => {
    try {
      const parsed = JSON.parse(schemaText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return 'JSON object bo\'lishi kerak.';
      }
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [schemaText]);

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (jsonError) {
      setError(`JSON xatosi: ${jsonError}`);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const parsed = JSON.parse(schemaText);
      const res = await api.post<OwnerResponse>(
        `/projects/owner/by_slug/${encodeURIComponent(slug)}/save/`,
        { schema_data: parsed, title: titleDraft },
      );
      if (!res.data.success || !res.data.site) {
        setError(res.data.error ?? 'Saqlashda xatolik.');
        return;
      }
      setSite(res.data.site);
      setTitleDraft(res.data.site.title);
      setSchemaText(JSON.stringify(res.data.site.schema_data ?? {}, null, 2));
      setSuccess(res.data.message ?? '✅ Saqlandi.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Saqlashda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Kirish kerak...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 shrink-0">
              Admin
            </span>
            <span className="font-semibold truncate">{site?.title || slug}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/${locale}/s/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition"
            >
              Saytni ko&apos;rish ↗
            </a>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !!jsonError}
              className="text-xs px-4 py-1.5 rounded-lg font-bold bg-amber-500 text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
            Yuklanmoqda...
          </div>
        ) : !site ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
            Sayt topilmadi.
          </div>
        ) : (
          <>
            {/* siteName / title */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Sayt nomi
                </span>
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Sayt nomi"
                />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Stat label="Slug" value={site.slug} />
                <Stat label="Til" value={site.language} />
                <Stat label="Status" value={site.is_published ? 'Publik' : 'Privat'} />
                <Stat
                  label="Yangilangan"
                  value={new Date(site.updated_at).toLocaleString(locale)}
                />
              </div>
            </section>

            {/* JSON editor */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">Schema JSON</h2>
                <span
                  className={`text-xs ${
                    jsonError ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {jsonError ? `❌ ${jsonError}` : '✓ Yaroqli JSON'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Bu yerda saytning tuzilishi (sahifalar, sektsiyalar, matn, ranglar) saqlanadi.
                Faqat haqiqiy JSON yozing. Saqlaganingizda sayt darhol yangilanadi.
              </p>
              <textarea
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                spellCheck={false}
                rows={28}
                className="w-full px-4 py-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500"
              />
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !!jsonError}
                className="px-6 py-2.5 rounded-lg font-bold bg-amber-500 text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-zinc-200 text-xs">{value}</div>
    </div>
  );
}
