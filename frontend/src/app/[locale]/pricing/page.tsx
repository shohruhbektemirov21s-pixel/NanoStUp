'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, X, Loader2, Sparkles, Zap, Crown, Building2, Gift,
  ChevronDown,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/store/authStore';
import api from '@/shared/api/axios';
import { formatUzsPrice } from '@/shared/utils/currency';

// ── Types ───────────────────────────────────────────────────────

interface Tariff {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  projects_limit: number;
  ai_generations_limit: number;
  features: string[];
  is_active?: boolean;
  nano_coins_included?: number;
}

type TierKey = 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS';

// ── Tier presentation config ───────────────────────────────────

const TIER_PRESENTATION: Record<TierKey, {
  Icon: typeof Sparkles;
  accent: string;
  glow: string;
  badge?: string;
  popular?: boolean;
}> = {
  FREE: {
    Icon: Gift,
    accent: 'from-zinc-600 to-zinc-700',
    glow: 'shadow-zinc-500/10',
  },
  BASIC: {
    Icon: Zap,
    accent: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/20',
  },
  PRO: {
    Icon: Crown,
    accent: 'from-purple-600 to-pink-600',
    glow: 'shadow-purple-500/30',
    popular: true,
  },
  BUSINESS: {
    Icon: Building2,
    accent: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/20',
  },
};

// Price → tier guess
function detectTier(tariff: Tariff): TierKey {
  const price = parseFloat(tariff.price) || 0;
  const name = tariff.name.toLowerCase();
  if (price === 0 || name.includes('free') || name.includes('bepul')) return 'FREE';
  if (name.includes('business') || name.includes('biznes') || price >= 500000) return 'BUSINESS';
  if (name.includes('pro') || (price >= 150000 && price < 500000)) return 'PRO';
  return 'BASIC';
}

// ── Static features matrix (multilingual) ───────────────────────

interface FeatureRow {
  key: string;
  uz: string; ru: string; en: string;
  values: Record<TierKey, string | boolean>;
}

const FEATURE_MATRIX: FeatureRow[] = [
  {
    key: 'live_sites',
    uz: 'Faol saytlar', ru: 'Активные сайты', en: 'Live sites',
    values: { FREE: '1 demo', BASIC: '1', PRO: '3', BUSINESS: '10' },
  },
  {
    key: 'hosting',
    uz: 'Hosting', ru: 'Хостинг', en: 'Hosting',
    values: { FREE: false, BASIC: true, PRO: true, BUSINESS: true },
  },
  {
    key: 'subdomain',
    uz: 'NanoStUp subdomain', ru: 'NanoStUp субдомен', en: 'NanoStUp subdomain',
    values: { FREE: true, BASIC: true, PRO: true, BUSINESS: true },
  },
  {
    key: 'custom_domain',
    uz: 'Custom domen', ru: 'Свой домен', en: 'Custom domain',
    values: { FREE: false, BASIC: false, PRO: true, BUSINESS: true },
  },
  {
    key: 'remove_branding',
    uz: 'NanoStUp brendingsiz', ru: 'Без брендинга', en: 'Remove branding',
    values: { FREE: false, BASIC: false, PRO: true, BUSINESS: true },
  },
  {
    key: 'ai_generations',
    uz: 'Oylik AI generatsiya', ru: 'AI-генерации/мес', en: 'AI generations/mo',
    values: { FREE: '5', BASIC: '50', PRO: '200', BUSINESS: '∞' },
  },
  {
    key: 'priority',
    uz: 'Ustuvor generatsiya', ru: 'Приоритет', en: 'Priority generation',
    values: { FREE: false, BASIC: false, PRO: true, BUSINESS: true },
  },
  {
    key: 'export',
    uz: 'ZIP eksport (HTML/CSS)', ru: 'Экспорт ZIP', en: 'ZIP export',
    values: { FREE: false, BASIC: false, PRO: true, BUSINESS: true },
  },
  {
    key: 'seo',
    uz: 'SEO vositalari', ru: 'SEO-инструменты', en: 'SEO tools',
    values: { FREE: false, BASIC: false, PRO: true, BUSINESS: true },
  },
  {
    key: 'analytics',
    uz: 'Analitika', ru: 'Аналитика', en: 'Analytics',
    values: { FREE: false, BASIC: 'asosiy', PRO: 'kengaytirilgan', BUSINESS: 'premium' },
  },
  {
    key: 'support',
    uz: 'Qo\'llab-quvvatlash', ru: 'Поддержка', en: 'Support',
    values: { FREE: false, BASIC: 'email', PRO: 'priority', BUSINESS: '24/7 premium' },
  },
];

// ── FAQ ────────────────────────────────────────────────────────

const FAQ_ITEMS: { uz: [string, string]; ru: [string, string]; en: [string, string] }[] = [
  {
    uz: ['Bepul rejada nima bor?', 'Bepul rejada 1 ta demo sayt yaratasiz va NanoStUp subdomain orqali ko\'rsatasiz. AI yordamida bemalol sinab ko\'rishingiz mumkin.'],
    ru: ['Что входит в бесплатный план?', 'В бесплатном плане вы создаёте 1 демо-сайт на субдомене NanoStUp. Можно свободно тестировать ИИ-помощник.'],
    en: ['What\'s in the free plan?', 'You can create 1 demo site on a NanoStUp subdomain. Try AI generation free of charge.'],
  },
  {
    uz: ['Obuna tugasa saytim o\'chiriladimi?', 'Yo\'q. Sayt ma\'lumotlari saqlanadi, lekin publik URL "Hosting muddati tugagan" overlay\'i bilan ko\'rinadi. Obunani yangilashingiz bilanoq sayt avtomatik qaytadi.'],
    ru: ['Удалится ли мой сайт после истечения подписки?', 'Нет. Данные сохраняются, а публичный URL временно показывает оверлей "Срок истёк". После обновления подписки сайт автоматически восстановится.'],
    en: ['Will my site be deleted when subscription expires?', 'No. Data is preserved; the public URL shows an "expired" overlay. Renewing instantly restores the site.'],
  },
  {
    uz: ['Custom domen qanday ulanadi?', 'Pro va Business rejalarda /site-admin sahifasida Domain bo\'limidan domeningizni kiriting. DNS A-record\'ni nanostup.uz\'ga yo\'naltiring — bizning tizim 1 soat ichida tasdiqlaydi.'],
    ru: ['Как подключить свой домен?', 'В планах Pro и Business в админке сайта в разделе Domain введите свой домен. Настройте DNS A-запись на nanostup.uz — мы подтвердим в течение часа.'],
    en: ['How do I connect a custom domain?', 'On Pro and Business plans, go to your site admin → Domain section. Point the DNS A-record to nanostup.uz and we\'ll verify within 1 hour.'],
  },
  {
    uz: ['To\'lovni qanday qilaman?', 'Payme, Click va Paynet orqali. To\'lov tasdiqlanishi bilan obuna darhol faol bo\'ladi.'],
    ru: ['Как оплатить?', 'Через Payme, Click или Paynet. Подписка активируется сразу после подтверждения платежа.'],
    en: ['How do I pay?', 'Via Payme, Click, or Paynet (Uzbekistan). Your subscription activates immediately after confirmation.'],
  },
  {
    uz: ['Tariflar oralig\'ida o\'tish mumkinmi?', 'Ha, istalgan paytda yuqori tarifga o\'tishingiz mumkin. Qoldiq kunlar yangi tarifga proportional o\'tkaziladi.'],
    ru: ['Можно ли менять тариф?', 'Да, в любой момент. Остаток дней пересчитывается по новому тарифу.'],
    en: ['Can I switch plans?', 'Yes, anytime. Remaining days will be prorated to the new plan.'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function CellValue({ v }: { v: string | boolean }) {
  if (typeof v === 'boolean') {
    return v
      ? <Check className="w-5 h-5 text-emerald-400 mx-auto" />
      : <X className="w-5 h-5 text-zinc-600 mx-auto" />;
  }
  return <span className="text-zinc-200 text-sm font-medium">{v}</span>;
}

// ── Main ─────────────────────────────────────────────────────────

export default function PricingPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();
  const t = useTranslations('Pricing');
  const tAuth = useTranslations('Auth');
  const locale = useLocale();
  const lng = (locale === 'ru' || locale === 'en' ? locale : 'uz') as 'uz' | 'ru' | 'en';
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    api.get<Tariff[]>('/subscriptions/tariffs/')
      .then((res) => setTariffs(res.data.filter((tf) => tf.is_active !== false)))
      .catch(() => setTariffs([]))
      .finally(() => setLoading(false));
  }, []);

  // Bog'lanish: API tariff → tier presentation
  const tierByKey: Record<TierKey, Tariff | null> = { FREE: null, BASIC: null, PRO: null, BUSINESS: null };
  for (const tf of tariffs) {
    const key = detectTier(tf);
    if (!tierByKey[key]) tierByKey[key] = tf;
  }
  // Free har doim bo'lishi kerak (oshkora plan)
  if (!tierByKey.FREE) {
    tierByKey.FREE = {
      id: -1, name: lng === 'ru' ? 'Бесплатный' : lng === 'en' ? 'Free' : 'Bepul',
      description: lng === 'ru' ? 'Демо для теста' : lng === 'en' ? 'Demo to try out' : 'Sinab ko\'rish',
      price: '0', duration_days: 0, projects_limit: 1, ai_generations_limit: 5,
      features: [],
    };
  }

  const handleSelectPlan = (tariff: Tariff | null) => {
    if (!tariff || parseFloat(tariff.price) === 0) {
      router.push(isAuthenticated ? '/dashboard' : '/register');
      return;
    }
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(`/checkout/${tariff.id}`);
  };

  const tierOrder: TierKey[] = ['FREE', 'BASIC', 'PRO', 'BUSINESS'];

  // ── Translations ───────────────────────────────────────────
  const txt = {
    uz: {
      eyebrow: 'Tariflar',
      heroTitle: 'Loyihangizga mos rejani tanlang',
      heroSub: 'Bepul boshlang, kerak bo\'lganda yangilang. Istalgan paytda bekor qila olasiz.',
      mostPopular: 'Eng mashhur',
      perMonth: '/oy',
      free: 'Bepul',
      featuresTitle: 'Reja imkoniyatlari',
      compare: 'To\'liq taqqoslash',
      faq: 'Tez-tez beriladigan savollar',
      ctaTitle: 'Bugun boshlang',
      ctaSub: '5 daqiqada birinchi saytingizni AI bilan yarating',
      ctaBtn: 'Bepul boshlash',
    },
    ru: {
      eyebrow: 'Тарифы',
      heroTitle: 'Выберите подходящий план',
      heroSub: 'Начните бесплатно, обновляйтесь по мере роста. Отменить можно в любой момент.',
      mostPopular: 'Самый популярный',
      perMonth: '/мес',
      free: 'Бесплатно',
      featuresTitle: 'Возможности тарифа',
      compare: 'Полное сравнение',
      faq: 'Частые вопросы',
      ctaTitle: 'Начните сегодня',
      ctaSub: 'Создайте свой первый сайт с ИИ за 5 минут',
      ctaBtn: 'Начать бесплатно',
    },
    en: {
      eyebrow: 'Pricing',
      heroTitle: 'Pick the plan that fits',
      heroSub: 'Start free, upgrade when you grow. Cancel anytime.',
      mostPopular: 'Most popular',
      perMonth: '/mo',
      free: 'Free',
      featuresTitle: 'Plan capabilities',
      compare: 'Full comparison',
      faq: 'Frequently asked questions',
      ctaTitle: 'Start today',
      ctaSub: 'Build your first AI site in 5 minutes',
      ctaBtn: 'Start free',
    },
  }[lng];

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20 pb-32 px-4 relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-3xl opacity-20 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600" />
      </div>

      <Link
        href="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm backdrop-blur-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{tAuth('backHome')}</span>
      </Link>

      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <header className="text-center mb-16 mt-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {txt.eyebrow}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-5 tracking-tight max-w-3xl mx-auto"
          >
            {txt.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-xl mx-auto"
          >
            {txt.heroSub}
          </motion.p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {/* Pricing cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-20">
              {tierOrder.map((key, i) => {
                const tariff = tierByKey[key];
                const cfg = TIER_PRESENTATION[key];
                const Icon = cfg.Icon;
                const tierLabel = key === 'FREE' ? (lng === 'ru' ? 'Бесплатный' : lng === 'en' ? 'Free' : 'Bepul')
                                 : key === 'BASIC' ? 'Basic'
                                 : key === 'PRO' ? 'Pro' : 'Business';
                const description = key === 'FREE' ? (lng === 'ru' ? 'Демо для теста' : lng === 'en' ? 'Demo for testing' : 'Sinab ko\'rish')
                                 : key === 'BASIC' ? (lng === 'ru' ? 'Для одного сайта' : lng === 'en' ? 'For a single site' : 'Bitta sayt uchun')
                                 : key === 'PRO' ? (lng === 'ru' ? 'Для бизнеса и креаторов' : lng === 'en' ? 'For businesses and creators' : 'Biznes va ijodkorlar uchun')
                                 : (lng === 'ru' ? 'Для агентств и команд' : lng === 'en' ? 'For agencies and teams' : 'Agentlik va jamoalar uchun');

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className={`relative p-6 lg:p-7 rounded-3xl border flex flex-col ${
                      cfg.popular
                        ? 'border-purple-500/50 bg-gradient-to-br from-purple-900/30 to-pink-900/20 shadow-2xl ' + cfg.glow
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    {cfg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-[10px] font-black flex items-center gap-1 whitespace-nowrap uppercase tracking-widest shadow-lg">
                        <Sparkles className="w-3 h-3" /> {txt.mostPopular}
                      </div>
                    )}

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cfg.accent} flex items-center justify-center mb-5 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-xl font-black mb-1">{tierLabel}</h3>
                    <p className="text-zinc-400 text-xs mb-6 min-h-[32px]">{description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      {tariff ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black">
                              {parseFloat(tariff.price) === 0
                                ? txt.free
                                : formatUzsPrice(tariff.price, t('currency'), txt.free)}
                            </span>
                            {parseFloat(tariff.price) > 0 && (
                              <span className="text-zinc-500 text-sm">{txt.perMonth}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-zinc-500 text-sm italic">
                          {lng === 'ru' ? 'Скоро' : lng === 'en' ? 'Coming soon' : 'Tez orada'}
                        </div>
                      )}
                    </div>

                    {/* Top features list */}
                    <div className="space-y-2.5 mb-6 flex-1">
                      {FEATURE_MATRIX.slice(0, 6).map((f) => {
                        const v = f.values[key];
                        const isOn = v === true || (typeof v === 'string' && v !== 'false');
                        return (
                          <div key={f.key} className="flex items-start gap-2 text-sm">
                            {isOn ? (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                            )}
                            <span className={isOn ? 'text-zinc-200' : 'text-zinc-600'}>
                              {f[lng]}{typeof v === 'string' && v !== 'true' && v !== 'false' ? `: ${v}` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={() => handleSelectPlan(tariff)}
                      disabled={!tariff && key !== 'FREE'}
                      className={`w-full py-5 rounded-2xl font-bold transition-all ${
                        cfg.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30'
                          : key === 'FREE'
                            ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                            : 'bg-white text-zinc-900 hover:bg-zinc-200'
                      }`}
                    >
                      {key === 'FREE' ? (lng === 'ru' ? 'Начать бесплатно' : lng === 'en' ? 'Start free' : 'Bepul boshlash')
                                     : (lng === 'ru' ? 'Выбрать' : lng === 'en' ? 'Choose' : 'Tanlash')}
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {/* Comparison table */}
            <section className="mb-24">
              <h2 className="text-2xl md:text-3xl font-black text-center mb-2">{txt.compare}</h2>
              <p className="text-zinc-400 text-center mb-10 max-w-md mx-auto">
                {lng === 'ru' ? 'Все возможности тарифов' :
                 lng === 'en' ? 'All plan features at a glance' :
                 'Barcha tariflar imkoniyatlari'}
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="text-left p-4 text-zinc-400 font-semibold">
                        {lng === 'ru' ? 'Возможность' : lng === 'en' ? 'Feature' : 'Imkoniyat'}
                      </th>
                      {tierOrder.map((key) => (
                        <th key={key} className="p-4 text-center">
                          <span className={`text-xs font-black uppercase tracking-wider bg-gradient-to-br ${TIER_PRESENTATION[key].accent} bg-clip-text text-transparent`}>
                            {key}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_MATRIX.map((f, i) => (
                      <tr key={f.key} className={i % 2 === 0 ? 'bg-white/[0.01]' : ''}>
                        <td className="p-4 text-zinc-300">{f[lng]}</td>
                        {tierOrder.map((key) => (
                          <td key={key} className="p-4 text-center">
                            <CellValue v={f.values[key]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* FAQ */}
            <section className="mb-20 max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-center mb-10">{txt.faq}</h2>
              <div className="space-y-3">
                {FAQ_ITEMS.map((item, i) => {
                  const [q, a] = item[lng];
                  const isOpen = openFaq === i;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.05] transition"
                      >
                        <span className="font-semibold text-white">{q}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed">
                          {a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* CTA banner */}
            <section className="rounded-3xl bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-blue-900/40 border border-white/10 p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(circle_at_30%_50%,#7c3aed,transparent_50%)]" />
              <Sparkles className="w-10 h-10 text-purple-300 mx-auto mb-4" />
              <h3 className="text-2xl md:text-4xl font-black mb-3">{txt.ctaTitle}</h3>
              <p className="text-zinc-300 max-w-md mx-auto mb-7">{txt.ctaSub}</p>
              <Link
                href={isAuthenticated ? '/builder' : '/register'}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white text-zinc-900 font-bold hover:scale-[1.02] transition shadow-2xl"
              >
                <Sparkles className="w-4 h-4" />
                {txt.ctaBtn}
              </Link>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
