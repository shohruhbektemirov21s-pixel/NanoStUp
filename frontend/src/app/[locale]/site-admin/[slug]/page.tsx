'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  ExternalLink,
  Eye,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';

import { EditorTab, type SchemaShape } from './EditorTab';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

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

type Tab = 'dashboard' | 'editor' | 'settings';

const NAV: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'editor', label: 'Tahrirlash', icon: Wand2 },
  { key: 'dashboard', label: 'Boshqaruv', icon: LayoutDashboard },
  { key: 'settings', label: 'Sozlamalar', icon: Settings },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function SiteAdminPage() {
  const params = useParams<{ slug: string; locale: string }>();
  const slug = String(params?.slug ?? '');
  const locale = String(params?.locale ?? 'uz');

  const { isAuthenticated, isTokenExpired, setAuth, user, logout } = useAuthStore();
  const authed = isAuthenticated && !isTokenExpired();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [site, setSite] = useState<OwnerSite | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [schemaText, setSchemaText] = useState('');

  const [tab, setTab] = useState<Tab>('editor');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inline login form (NanoStUp asosiy login/register sahifasiga umuman olib bormaydi)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // ── Load site (faqat auth bo'lganda) ───────────────────────
  useEffect(() => {
    if (!authed || !slug) {
      setLoading(false);
      return;
    }
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
          setAuthError('Sessiya tugagan. Iltimos, qayta kiring.');
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
  }, [authed, slug]);

  // ── Inline login ───────────────────────────────────────────
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoginBusy(true);
    try {
      const resp = await api.post('/accounts/login/', {
        email: loginEmail.trim(),
        password: loginPassword,
      });
      const access = resp.data?.access as string | undefined;
      if (!access) throw new Error('Token yo\'q');
      const me = await api.get('/accounts/me/', {
        headers: { Authorization: `Bearer ${access}` },
      });
      setAuth(me.data, access);
      setLoginPassword('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; error?: string } } };
      setAuthError(
        e.response?.data?.detail
          ?? e.response?.data?.error
          ?? 'Email yoki parol noto\'g\'ri.',
      );
    } finally {
      setLoginBusy(false);
    }
  };

  // ── Download ZIP (owner-only, fast) ────────────────────────
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const resp = await api.get<Blob>(
        `/projects/owner/by_slug/${encodeURIComponent(slug)}/download/`,
        { responseType: 'blob' },
      );
      const blob = resp.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(site?.title || slug).replace(/[^a-z0-9-_ ]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess('✅ ZIP yuklab olindi.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Yuklab olishda xatolik.');
    } finally {
      setDownloading(false);
    }
  };

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

  // ── Schema stats (Dashboard KPI uchun) ─────────────────────
  const schemaStats = useMemo(() => {
    try {
      const parsed = JSON.parse(schemaText) as Record<string, unknown>;
      const pages = Array.isArray(parsed?.pages) ? parsed.pages as Array<{ sections?: unknown[] }> : [];
      const pageCount = pages.length || 1;
      const sectionCount = pages.reduce((sum, p) => sum + (Array.isArray(p?.sections) ? p.sections.length : 0), 0);
      return { pageCount, sectionCount };
    } catch {
      return { pageCount: 0, sectionCount: 0 };
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

  // ══════════════════════════════════════════════════════════════
  // 🔐 INLINE LOGIN (auth yo'q bo'lsa)
  // ══════════════════════════════════════════════════════════════
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleInlineLogin}
          className="w-full max-w-sm rounded-2xl border border-white/5 bg-zinc-900 p-8 space-y-5 shadow-2xl"
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto bg-gradient-to-tr from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-3">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
              Site Admin
            </p>
            <h1 className="mt-1 text-lg font-black">Kirish</h1>
            <p className="mt-1 text-xs text-zinc-500 break-all">{slug}</p>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              ⚠️ {authError}
            </div>
          )}

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Email
            </span>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="username"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-purple-500 transition"
              placeholder="email@example.com"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Parol
            </span>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-purple-500 transition"
              placeholder="••••••••"
            />
          </label>

          <motion.button
            type="submit"
            disabled={loginBusy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loginBusy ? 'Tekshirilmoqda...' : 'Kirish'}
          </motion.button>

          <p className="text-center text-[11px] text-zinc-600 leading-relaxed">
            Faqat sayt egasi (NanoStUp akkaunti) kira oladi.
          </p>
        </motion.form>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 🎛 ADMIN LAYOUT (sidebar + main)
  // ══════════════════════════════════════════════════════════════
  const currentNav = NAV.find((n) => n.key === tab) ?? NAV[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-zinc-900 border-r border-white/5
          flex flex-col transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm tracking-tight truncate">
                {site?.title || 'Sayt'}
              </p>
              <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                Site Admin
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-zinc-500 hover:text-white shrink-0"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.key === tab;
            return (
              <motion.button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setSidebarOpen(false);
                }}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </motion.button>
            );
          })}

          <a
            href={`/${locale}/s/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            Saytni ochish
          </a>
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-purple-400">Sayt egasi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-4 px-4 md:px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-zinc-400 hover:text-white"
            aria-label="Menyu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{currentNav.label}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/${locale}/s/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              Sayt
            </a>
            <motion.button
              type="button"
              onClick={handleDownload}
              disabled={downloading || loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-700/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Sayt kodini ZIP holida yuklab olish"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Yuklanmoqda...' : 'ZIP'}
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !!jsonError}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-bold bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </motion.button>
          </div>
        </header>

        {/* Page content */}
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 p-4 md:p-6 overflow-auto max-w-6xl w-full mx-auto space-y-5"
        >
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
            <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500">
              Yuklanmoqda...
            </div>
          ) : !site ? (
            <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500">
              Sayt topilmadi.
            </div>
          ) : tab === 'editor' ? (
            <EditorTab
              schema={(() => {
                try {
                  return JSON.parse(schemaText) as SchemaShape;
                } catch {
                  return {} as SchemaShape;
                }
              })()}
              setSchema={(s) => setSchemaText(JSON.stringify(s, null, 2))}
              saving={saving}
              onSave={handleSave}
            />
          ) : tab === 'dashboard' ? (
            <DashboardTab
              site={site}
              schemaStats={schemaStats}
              locale={locale}
              onEditSettings={() => setTab('settings')}
              onEditVisual={() => setTab('editor')}
              onDownload={handleDownload}
              downloading={downloading}
            />
          ) : (
            <SettingsTab
              site={site}
              titleDraft={titleDraft}
              setTitleDraft={setTitleDraft}
              saving={saving}
              onSave={handleSave}
            />
          )}
        </motion.main>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 p-5"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-10 blur-3xl rounded-full -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} bg-opacity-20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <p className="text-2xl font-black text-white mb-1 truncate">{value}</p>
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </motion.div>
  );
}

function DashboardTab({
  site,
  schemaStats,
  locale,
  onEditSettings,
  onEditVisual,
  onDownload,
  downloading,
}: {
  site: OwnerSite;
  schemaStats: { pageCount: number; sectionCount: number };
  locale: string;
  onEditSettings: () => void;
  onEditVisual: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const updated = new Date(site.updated_at).toLocaleString(locale);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          index={0}
          label="Sahifalar"
          value={schemaStats.pageCount}
          sub="Saytdagi sahifalar"
          icon={Layers}
          color="bg-blue-500"
        />
        <KpiCard
          index={1}
          label="Bo'limlar"
          value={schemaStats.sectionCount}
          sub="Jami sektsiyalar"
          icon={Sparkles}
          color="bg-purple-500"
        />
        <KpiCard
          index={2}
          label="Holat"
          value={site.is_published ? 'Publik' : 'Privat'}
          sub={`Til: ${site.language?.toUpperCase() ?? '—'}`}
          icon={Eye}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900 rounded-2xl border border-white/5 p-5"
        >
          <h2 className="font-bold text-white mb-4 text-sm">Sayt ma&apos;lumotlari</h2>
          <dl className="space-y-2.5 text-sm">
            <Row label="Nomi" value={site.title} />
            <Row label="Slug" value={site.slug} />
            <Row label="Til" value={site.language?.toUpperCase() ?? '—'} />
            <Row label="Holat" value={site.is_published ? 'Publik' : 'Privat'} />
            <Row label="Yangilangan" value={updated} />
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-zinc-900 rounded-2xl border border-white/5 p-5"
        >
          <h2 className="font-bold text-white mb-4 text-sm">Tez harakatlar</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <QuickAction
              icon={Wand2}
              label="Saytni tahrirlash"
              color="text-pink-400"
              bg="bg-pink-500/10"
              onClick={onEditVisual}
            />
            <QuickAction
              icon={Download}
              label={downloading ? 'ZIP yuklanmoqda...' : 'Sayt kodini ZIP yuklab olish'}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
              onClick={onDownload}
              disabled={downloading}
            />
            <QuickAction
              icon={Settings}
              label="Sozlamalar"
              color="text-blue-400"
              bg="bg-blue-500/10"
              onClick={onEditSettings}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SettingsTab({
  site,
  titleDraft,
  setTitleDraft,
  saving,
  onSave,
}: {
  site: OwnerSite;
  titleDraft: string;
  setTitleDraft: (s: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-zinc-900 p-5 space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Settings className="w-4 h-4 text-blue-400" />
        Asosiy sozlamalar
      </h2>

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Sayt nomi
        </span>
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-purple-500 transition"
          placeholder="Sayt nomi"
        />
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <ReadOnly label="Slug" value={site.slug} />
        <ReadOnly label="Til" value={site.language?.toUpperCase() ?? '—'} />
        <ReadOnly label="Holat" value={site.is_published ? 'Publik' : 'Privat'} />
      </div>

      <div className="flex justify-end">
        <motion.button
          type="button"
          onClick={onSave}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </motion.button>
      </div>
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
      <dt className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">{label}</dt>
      <dd className="text-zinc-200 text-sm text-right break-all">{value}</dd>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-zinc-200 text-xs">{value}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  color,
  bg,
  onClick,
  disabled,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3 rounded-xl ${bg} border border-white/5 hover:border-white/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <span className="font-semibold text-xs text-white">{label}</span>
    </motion.button>
  );
}
