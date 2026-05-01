'use client';

/**
 * builder/page.tsx ichidan ajratilgan presentational helperlar:
 *   - BuildLang / BuildCopy / BUILD_MESSAGES dictionary (uz/ru/en)
 *   - pickBuildCopy(locale) → tilga mos matnlar
 *   - BUILD_TRIGGER_REGEX + looksLikeBuildTrigger(text) — "yarat/build/готово" detect
 *   - GenerationProgress — generatsiya animatsiyasi (timer + steps + "sahifadan chiqmang")
 *   - GenerationStatsPanel — generatsiyadan keyingi statistika
 *   - PhaseBadge — chat tepasidagi holat indikator
 *
 * Bu modul AI flow yoki API logikasiga aralashmaydi — faqat ko'rinish.
 */

import { motion } from 'framer-motion';
import {
  BarChart2, CheckCircle2, Clock, Coins, Loader2, MessageSquare,
  Sparkles, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

// ── i18n: uz/ru/en lokalizatsiya ──────────────────────────────────

export type BuildLang = 'uz' | 'ru' | 'en';

export interface BuildCopy {
  title: string;
  estimateShort: string;     // <30s
  estimateMid: string;       // 30-90s
  estimateLong: string;      // >90s
  doNotLeave: string;        // banner: "Sahifadan chiqmang"
  doNotLeaveDetail: string;  // tushuntirish
  steps: string[];           // 5 ta bosqich
  elapsedSuffix: string;     // "soniya o'tdi"
  beforeUnload: string;      // browser confirm() matni
  chatNotice: string;        // chatga avtomatik qo'shiladigan xabar
  chatTyping: string;        // "Kod yozilmoqda…"
  chatThinking: string;      // "AI tahlil qilmoqda…"
}

export const BUILD_MESSAGES: Record<BuildLang, BuildCopy> = {
  uz: {
    title: 'Sun\'iy intellekt saytingizni yaratmoqda…',
    estimateShort: '🤖 AI kod yozyapti — taxminan 30-60 soniya kuting',
    estimateMid: '⏳ Murakkab sayt — 1-2 daqiqa ketishi mumkin',
    estimateLong: '🔄 Deyarli tayyor, iltimos sahifadan chiqmay biroz kuting…',
    doNotLeave: 'Sahifadan chiqmang!',
    doNotLeaveDetail: 'Saytingiz tayyorlanyapti. Iltimos, ushbu sahifani yopmang yoki yangilamang — aks holda jarayon to\'xtaydi.',
    steps: [
      'Loyiha tahlil qilinmoqda',
      'Sahifalar tuzilishi belgilanmoqda',
      'Kontent yaratilmoqda',
      'Dizayn va uslub qo\'llanilmoqda',
      'Sayt yakunlanmoqda',
    ],
    elapsedSuffix: 'soniya o\'tdi',
    beforeUnload: 'Sayt yaratilmoqda. Sahifadan chiqsangiz jarayon to\'xtaydi. Davom etasizmi?',
    chatNotice: '🚀 **Saytingizni yaratishni boshladim!**\n\n⏱ Taxminiy vaqt: **30-90 soniya** (sayt murakkabligiga qarab).\n\n⚠️ **Iltimos, ushbu sahifadan chiqmang va yangilamang** — sun\'iy intellekt saytingizni yaratmoqda. Tayyor bo\'lishi bilanoq xabar beraman.',
    chatTyping: 'Kod yozilmoqda — sahifadan chiqmang…',
    chatThinking: 'AI tahlil qilmoqda…',
  },
  ru: {
    title: 'Искусственный интеллект создаёт ваш сайт…',
    estimateShort: '🤖 AI пишет код — подождите примерно 30-60 секунд',
    estimateMid: '⏳ Сложный сайт — может занять 1-2 минуты',
    estimateLong: '🔄 Почти готово, пожалуйста, не покидайте страницу…',
    doNotLeave: 'Не покидайте страницу!',
    doNotLeaveDetail: 'Ваш сайт сейчас создаётся. Не закрывайте и не обновляйте эту страницу — иначе процесс прервётся.',
    steps: [
      'Анализ проекта',
      'Определение структуры страниц',
      'Генерация контента',
      'Применение дизайна и стиля',
      'Финализация сайта',
    ],
    elapsedSuffix: 'сек прошло',
    beforeUnload: 'Сайт создаётся. Если вы покинете страницу, процесс остановится. Продолжить?',
    chatNotice: '🚀 **Начал создавать ваш сайт!**\n\n⏱ Примерное время: **30-90 секунд** (зависит от сложности).\n\n⚠️ **Пожалуйста, не покидайте и не обновляйте эту страницу** — искусственный интеллект сейчас создаёт ваш сайт. Я сообщу, как только всё будет готово.',
    chatTyping: 'Пишу код — не уходите со страницы…',
    chatThinking: 'AI анализирует…',
  },
  en: {
    title: 'AI is building your website…',
    estimateShort: '🤖 AI is writing code — about 30-60 seconds',
    estimateMid: '⏳ Complex site — may take 1-2 minutes',
    estimateLong: '🔄 Almost ready, please stay on this page…',
    doNotLeave: 'Don\'t leave this page!',
    doNotLeaveDetail: 'Your site is being created. Please don\'t close or refresh this page — the process will stop if you do.',
    steps: [
      'Analyzing your project',
      'Designing page structure',
      'Generating content',
      'Applying design and style',
      'Finalizing the site',
    ],
    elapsedSuffix: 'seconds elapsed',
    beforeUnload: 'Your site is being generated. Leaving the page will cancel it. Continue?',
    chatNotice: '🚀 **Started building your site!**\n\n⏱ Estimated time: **30-90 seconds** (depending on complexity).\n\n⚠️ **Please don\'t leave or refresh this page** — AI is creating your site. I\'ll notify you as soon as it\'s ready.',
    chatTyping: 'Writing code — stay on this page…',
    chatThinking: 'AI is thinking…',
  },
};

export function pickBuildCopy(locale: string): BuildCopy {
  const key = (locale === 'ru' || locale === 'en') ? locale : 'uz';
  return BUILD_MESSAGES[key as BuildLang];
}

// Build trigger regex — uz/ru/en bo'yicha "yarat / build / готово" iboralari.
// Backend'dagi READY_TRIGGERS bilan sinxron bo'lishi kerak (services.py).
// Match → user "saytni boshla" deb buyuryapti → chat-notice + beforeunload yoqamiz.
export const BUILD_TRIGGER_REGEX = /\b(qur|yarat|qilib\s+ber|tayyor|boshla|davom|mayli|tushundim|build|create|make|start|go|готово|давай|сделай|поехали|продолжай)\b/i;

export function looksLikeBuildTrigger(text: string): boolean {
  if (!text) return false;
  return BUILD_TRIGGER_REGEX.test(text);
}

// ── Generation Stats interface (page.tsx ham ishlatadi) ─────────────

export interface GenerationStats {
  generation_time_ms: number;
  input_tokens: number;
  output_tokens: number;
  complexity: { level: string; label: string; color: string; sections: number; pages: number };
}

// ── Generation Progress (preview da) ──────────────────────────────

export function GenerationProgress({ startTime, locale }: { startTime: number; locale: string }) {
  const [elapsed, setElapsed] = useState(0);
  const copy = pickBuildCopy(locale);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(id);
  }, [startTime]);

  const steps = copy.steps.map((label, i) => ({
    label,
    done: i === 0 ? elapsed > 3
        : i === 1 ? elapsed > 8
        : i === 2 ? elapsed > 15
        : i === 3 ? elapsed > 22
        : false,
  }));
  const activeStep = steps.filter((s) => s.done).length;
  const progress = Math.min(95, (activeStep / steps.length) * 100 + (elapsed % 5) * 1.5);

  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-10">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30"
      >
        <Sparkles className="w-8 h-8 text-white" />
      </motion.div>

      <h2 className="text-xl font-black text-zinc-900 mb-1">{copy.title}</h2>
      <p className="text-zinc-400 text-sm mb-5">
        {elapsed < 30 ? copy.estimateShort : elapsed < 90 ? copy.estimateMid : copy.estimateLong}
      </p>

      {/* "Sahifadan chiqmang" — yorqin ogohlantirish banneri */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mb-5 px-4 py-3 rounded-2xl border border-amber-300 bg-amber-50 flex items-start gap-2.5"
      >
        <span className="text-lg leading-none mt-0.5">⚠️</span>
        <div>
          <div className="text-sm font-bold text-amber-900">{copy.doNotLeave}</div>
          <div className="text-xs text-amber-800 leading-relaxed mt-0.5">{copy.doNotLeaveDetail}</div>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full max-w-sm bg-zinc-100 rounded-full h-2 mb-5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0',
              step.done ? 'bg-emerald-500' : i === activeStep ? 'bg-purple-500 animate-pulse' : 'bg-zinc-200')}>
              {step.done
                ? <CheckCircle2 className="w-3 h-3 text-white" />
                : i === activeStep
                  ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
                  : null}
            </div>
            <span className={cn('text-xs', step.done ? 'text-emerald-600 line-through' : i === activeStep ? 'text-zinc-800 font-semibold' : 'text-zinc-400')}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
        <Clock className="w-3.5 h-3.5" />
        <span>{elapsed} {copy.elapsedSuffix}</span>
      </div>
    </div>
  );
}

// ── Generation Stats Panel ───────────────────────────────────────

export function GenerationStatsPanel({ stats }: { stats: GenerationStats }) {
  const totalTokens = stats.input_tokens + stats.output_tokens;
  const secs = (stats.generation_time_ms / 1000).toFixed(1);
  const complexityColors: Record<string, string> = {
    green: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    yellow: 'text-amber-600 bg-amber-50 border-amber-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };
  const colorClass = complexityColors[stats.complexity.color] ?? complexityColors.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-2 p-3 rounded-2xl bg-zinc-900/60 border border-white/10"
    >
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Generatsiya statistikasi</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60">
          <Clock className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
          <span className="text-xs font-bold text-white">{secs}s</span>
          <span className="text-[9px] text-zinc-500">Vaqt</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60">
          <Coins className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
          <span className="text-xs font-bold text-white">{Math.round(totalTokens / 10).toLocaleString()}</span>
          <span className="text-[9px] text-zinc-500">Nano koin</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-zinc-800/60">
          <BarChart2 className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
          <span className="text-xs font-bold text-white">{stats.complexity.sections}</span>
          <span className="text-[9px] text-zinc-500">Bo&apos;lim</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          ↑ {Math.round(stats.input_tokens / 10)} + ↓ {Math.round(stats.output_tokens / 10)} nano koin
        </span>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', colorClass)}>
          {stats.complexity.label}
        </span>
      </div>
    </motion.div>
  );
}

// ── Phase Badge ────────────────────────────────────────────────────

export function PhaseBadge({ phase }: { phase: 'idle' | 'architect' | 'building' | 'done' }) {
  const map = {
    idle:      { label: 'Tayyor',           color: 'bg-zinc-800 text-zinc-400',                                      icon: MessageSquare },
    architect: { label: 'Tahlil rejimda',   color: 'bg-blue-600/20 text-blue-300 border border-blue-500/30',         icon: Zap },
    building:  { label: 'Sayt qurilmoqda…', color: 'bg-purple-600/20 text-purple-300 border border-purple-500/30',   icon: Loader2 },
    done:      { label: 'Sayt tayyor!',     color: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30',icon: CheckCircle2 },
  };
  const { label, color, icon: Icon } = map[phase];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', color)}>
      <Icon className={cn('w-3 h-3', phase === 'building' && 'animate-spin')} />
      {label}
    </span>
  );
}
