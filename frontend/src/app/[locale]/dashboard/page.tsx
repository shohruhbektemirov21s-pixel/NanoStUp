'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Plus, Globe, Eye, Settings, AlertTriangle,
  CheckCircle2, Clock, Lock, Archive, Loader2, Search,
  Zap, Calendar, RefreshCw, ExternalLink,
  Coins,
} from 'lucide-react';
import { useLocale } from 'next-intl';

import { Link } from '@/i18n/routing';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────────

type HostingStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'ARCHIVED';

interface DashboardSite {
  id: string;
  title: string;
  slug: string | null;
  language: string;
  business_type: string;
  hosting_status: HostingStatus;
  hosting_expires_at: string | null;
  days_until_expiry: number | null;
  needs_renewal_soon: boolean;
  is_locked: boolean;
  is_live: boolean;
  is_published: boolean;
  custom_domain: string;
  custom_domain_verified: boolean;
  view_count: number;
  updated_at: string;
  created_at: string;
  suspension_reason: string;
}

interface DashboardSummary {
  total: number;
  active: number;
  trial: number;
  expired: number;
  suspended: number;
  archived: number;
}

interface CurrentSubscription {
  tariff_name?: string;
  status?: string;
  end_date?: string;
  nano_balance?: number;
}

// ── Status badge config ───────────────────────────────────────

const STATUS_CONFIG: Record<HostingStatus, {
  label: string;
  ru: string;
  en: string;
  Icon: typeof CheckCircle2;
  className: string;
  dotClass: string;
}> = {
  ACTIVE: {
    label: 'Faol', ru: 'Активен', en: 'Active',
    Icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
  },
  TRIAL: {
    label: 'Sinov', ru: 'Пробный', en: 'Trial',
    Icon: Clock,
    className: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-500',
  },
  EXPIRED: {
    label: 'Tugagan', ru: 'Истёк', en: 'Expired',
    Icon: AlertTriangle,
    className: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
  SUSPENDED: {
    label: 'To\'xtatilgan', ru: 'Приостановлен', en: 'Suspended',
    Icon: Lock,
    className: 'bg-red-500/10 text-red-300 border-red-500/30',
    dotClass: 'bg-red-500',
  },
  ARCHIVED: {
    label: 'Arxiv', ru: 'Архив', en: 'Archived',
    Icon: Archive,
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    dotClass: 'bg-zinc-500',
  },
};

function StatusBadge({ status, locale }: { status: HostingStatus; locale: string }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  const text = locale === 'ru' ? cfg.ru : locale === 'en' ? cfg.en : cfg.label;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ locale }: { locale: string }) {
  const titles = {
    uz: 'Birinchi saytingizni AI bilan 2 daqiqada yarating',
    ru: 'Создайте свой первый сайт с помощью ИИ за 2 минуты',
    en: 'Create your first site with AI in 2 minutes',
  };
  const subs = {
    uz: 'Faqat sayt nomini va biznes turini ayting — AI siz uchun professional saytni yaratadi.',
    ru: 'Просто опишите бизнес — ИИ создаст профессиональный сайт.',
    en: 'Just describe your business — AI will build a professional site for you.',
  };
  const ctas = {
    uz: 'Sayt yaratish',
    ru: 'Создать сайт',
    en: 'Create site',
  };
  const lng = (locale === 'ru' || locale === 'en' ? locale : 'uz') as 'uz' | 'ru' | 'en';

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
          <Sparkles className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-500 blur-2xl opacity-30 -z-10" />
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-3 max-w-md">
        {titles[lng]}
      </h2>
      <p className="text-zinc-400 text-center max-w-md mb-8">
        {subs[lng]}
      </p>
      <Link
        href="/builder"
        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold text-sm shadow-xl shadow-purple-500/30 hover:scale-[1.02] transition-all"
      >
        <Plus className="w-4 h-4" />
        {ctas[lng]}
      </Link>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({
  label, value, Icon, accent, sub,
}: {
  label: string;
  value: string | number;
  Icon: typeof Globe;
  accent: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── Site card ─────────────────────────────────────────────────

function SiteCard({ site, locale }: { site: DashboardSite; locale: string }) {
  const ctas = {
    uz: { open: 'Ochish', edit: 'Tahrirlash', renew: 'Yangilash' },
    ru: { open: 'Открыть', edit: 'Изменить', renew: 'Обновить' },
    en: { open: 'Open', edit: 'Edit', renew: 'Renew' },
  };
  const lng = (locale === 'ru' || locale === 'en' ? locale : 'uz') as 'uz' | 'ru' | 'en';
  const lbl = ctas[lng];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all overflow-hidden"
    >
      {/* Preview placeholder (gradient based on business type) */}
      <div className="aspect-video relative bg-gradient-to-br from-purple-900/40 via-zinc-800/50 to-blue-900/40 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
              {site.business_type || 'AI Site'}
            </p>
          </div>
        </div>
        {/* Status badge top-right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={site.hosting_status} locale={locale} />
        </div>
        {/* Renewal warning */}
        {site.needs_renewal_soon && site.days_until_expiry !== null && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="px-3 py-2 rounded-xl bg-amber-500 text-zinc-900 text-xs font-bold flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lng === 'ru'
                ? `Истекает через ${site.days_until_expiry} дн.`
                : lng === 'en'
                  ? `Expires in ${site.days_until_expiry}d`
                  : `${site.days_until_expiry} kun qoldi`}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-white text-base mb-1 truncate">
          {site.title || (lng === 'ru' ? 'Без названия' : lng === 'en' ? 'Untitled' : 'Sarlavhasiz')}
        </h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {site.view_count}
          </span>
          {site.custom_domain && (
            <span className="flex items-center gap-1 truncate">
              <Globe className="w-3 h-3" />
              {site.custom_domain}
            </span>
          )}
          {!site.custom_domain && site.slug && (
            <span className="flex items-center gap-1 truncate">
              <Globe className="w-3 h-3" />
              /{site.slug}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {site.slug && site.is_live ? (
            <Link
              href={`/s/${site.slug}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {lbl.open}
            </Link>
          ) : site.hosting_status === 'EXPIRED' ? (
            <Link
              href="/pricing"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {lbl.renew}
            </Link>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/50 text-zinc-500 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              {site.hosting_status}
            </span>
          )}
          {site.slug && (
            <Link
              href={`/site-admin/${site.slug}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition"
              aria-label={lbl.edit}
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function DashboardPage() {
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const tokensBalance = user?.tokens_balance;
  const nanoCoins = user?.nano_coins;
  const userEmail = user?.email;
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const [sites, setSites] = useState<DashboardSite[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | HostingStatus>('ALL');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sitesRes, subRes] = await Promise.all([
          api.get<{ success: boolean; sites: DashboardSite[]; summary: DashboardSummary }>(
            '/projects/dashboard/sites/',
          ),
          api.get<CurrentSubscription>('/subscriptions/my/current/').catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        setSites(sitesRes.data.sites || []);
        setSummary(sitesRes.data.summary);
        setSubscription(subRes.data);
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (filter !== 'ALL' && s.hosting_status !== filter) return false;
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sites, filter, search]);

  // ── Translations (inline to avoid extra config) ────────────
  const tx = {
    uz: {
      welcome: 'Xush kelibsiz',
      sub: 'Saytlaringiz va obunangiz boshqaruvi',
      newSite: 'Yangi sayt',
      sites: 'Saytlar',
      active: 'Faol',
      expired: 'Tugagan',
      nanoBalance: 'Nano koin',
      monthlyUsage: 'Oylik faollik',
      mySites: 'Mening saytlarim',
      filterAll: 'Barchasi',
      searchPlaceholder: 'Sayt nomi bo\'yicha qidirish...',
      noResults: 'Filterga mos sayt topilmadi',
      hosting: 'Hosting holati',
    },
    ru: {
      welcome: 'Добро пожаловать',
      sub: 'Управление сайтами и подпиской',
      newSite: 'Новый сайт',
      sites: 'Сайты',
      active: 'Активные',
      expired: 'Истёкшие',
      nanoBalance: 'Нано-монеты',
      monthlyUsage: 'Активность месяца',
      mySites: 'Мои сайты',
      filterAll: 'Все',
      searchPlaceholder: 'Поиск по названию...',
      noResults: 'По фильтру ничего не найдено',
      hosting: 'Статус хостинга',
    },
    en: {
      welcome: 'Welcome',
      sub: 'Manage your sites and subscription',
      newSite: 'New site',
      sites: 'Sites',
      active: 'Active',
      expired: 'Expired',
      nanoBalance: 'Nano coins',
      monthlyUsage: 'Monthly usage',
      mySites: 'My sites',
      filterAll: 'All',
      searchPlaceholder: 'Search by name...',
      noResults: 'No sites match your filter',
      hosting: 'Hosting status',
    },
  };
  const lng = (locale === 'ru' || locale === 'en' ? locale : 'uz') as 'uz' | 'ru' | 'en';
  const txt = tx[lng];

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Link
          href="/login"
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold"
        >
          {lng === 'ru' ? 'Войти' : lng === 'en' ? 'Sign in' : 'Kirish'}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-zinc-950/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight">
              {txt.welcome}
              {userEmail && (
                <span className="text-zinc-400 font-normal text-sm ml-2 hidden md:inline">
                  · {userEmail.split('@')[0]}
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-500 hidden md:block">{txt.sub}</p>
          </div>
          <Link
            href="/builder"
            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 hover:scale-[1.02] text-white font-bold text-xs md:text-sm shadow-lg shadow-purple-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">{txt.newSite}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              <StatCard
                label={txt.sites}
                value={summary?.total ?? 0}
                Icon={Globe}
                accent="bg-gradient-to-br from-purple-600 to-blue-600"
              />
              <StatCard
                label={txt.active}
                value={summary?.active ?? 0}
                Icon={CheckCircle2}
                accent="bg-gradient-to-br from-emerald-500 to-teal-600"
              />
              <StatCard
                label={txt.expired}
                value={(summary?.expired ?? 0) + (summary?.suspended ?? 0)}
                Icon={AlertTriangle}
                accent="bg-gradient-to-br from-amber-500 to-orange-600"
                sub={summary?.expired ? `${summary.expired} expired` : undefined}
              />
              <StatCard
                label={txt.nanoBalance}
                value={nanoCoins ?? 0}
                Icon={Coins}
                accent="bg-gradient-to-br from-yellow-500 to-amber-600"
                sub={tokensBalance ? `${tokensBalance.toLocaleString()} tokens` : undefined}
              />
            </div>

            {/* Subscription banner */}
            {subscription && subscription.tariff_name && (
              <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{subscription.tariff_name}</p>
                      {subscription.end_date && (
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {lng === 'ru' ? 'до' : lng === 'en' ? 'until' : 'tugashi'}{' '}
                          {new Date(subscription.end_date).toLocaleDateString(
                            lng === 'ru' ? 'ru-RU' : lng === 'en' ? 'en-US' : 'uz-UZ',
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/dashboard/subscription"
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
                  >
                    {lng === 'ru' ? 'Подробно' : lng === 'en' ? 'Manage' : 'Boshqarish'}
                  </Link>
                </div>
              </div>
            )}

            {/* My sites section */}
            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl md:text-2xl font-black">{txt.mySites}</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder={txt.searchPlaceholder}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none transition w-44 md:w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED', 'ARCHIVED'] as const).map((f) => {
                  const isActive = filter === f;
                  const count = f === 'ALL' ? summary?.total ?? 0 : summary?.[f.toLowerCase() as keyof DashboardSummary] ?? 0;
                  if (f !== 'ALL' && count === 0) return null;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        isActive
                          ? 'bg-white text-zinc-900'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {f === 'ALL' ? txt.filterAll : (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[f as HostingStatus].dotClass}`} />
                          {locale === 'ru' ? STATUS_CONFIG[f as HostingStatus].ru :
                           locale === 'en' ? STATUS_CONFIG[f as HostingStatus].en :
                           STATUS_CONFIG[f as HostingStatus].label}
                        </>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-zinc-200' : 'bg-white/10'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sites grid */}
              {filteredSites.length === 0 ? (
                sites.length === 0 ? (
                  <EmptyState locale={locale} />
                ) : (
                  <div className="text-center py-16 text-zinc-500 text-sm">
                    {txt.noResults}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {filteredSites.map((site) => (
                    <SiteCard key={site.id} site={site} locale={locale} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
