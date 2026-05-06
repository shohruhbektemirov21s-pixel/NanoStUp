'use client';

/**
 * AssistantPanel — site-admin'dagi AI yordamchi.
 *
 * Foydalanuvchi savol yozadi yoki tayyor FAQ kartochkasini bossa:
 *   1. Backend `match_faq()` mos topsa → instant javob (KB).
 *   2. Aks holda Gemini chat'iga yo'naltiriladi (google_search grounding).
 *
 * Endpoint: POST /api/ai/admin-assist/  + GET /api/ai/suggestions/?context=admin
 */

import { motion } from 'framer-motion';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import api from '@/shared/api/axios';
import { cn } from '@/lib/utils';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface AssistResp {
  source: 'kb' | 'ai';
  message: string;
  question?: string;
  kb_id?: string;
  error?: string;
}

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
  source?: 'kb' | 'ai';
}

interface Props {
  locale: string;
}

// Lokalizatsiyalangan matnlar (3 til)
const COPY: Record<string, Record<string, string>> = {
  uz: {
    title: 'AI yordamchi',
    subtitle: 'Sayt boshqaruvi haqida tezkor savol-javob',
    kbLabel: 'Tez-tez beriladigan savollar',
    inputPlaceholder: 'Savolingizni yozing… (mas: domenni qanday ulayman?)',
    send: 'Yuborish',
    thinking: 'Javob qidirilmoqda…',
    sourceKb: 'Bilim bazasidan',
    sourceAi: 'AI + internet',
    error: 'Javob olishda xatolik. Qayta urinib ko\'ring.',
    empty: 'Yordamchidan istalgan narsani so\'rang.',
  },
  ru: {
    title: 'AI-помощник',
    subtitle: 'Быстрые ответы по управлению сайтом',
    kbLabel: 'Часто задаваемые вопросы',
    inputPlaceholder: 'Напишите вопрос… (напр.: как подключить домен?)',
    send: 'Отправить',
    thinking: 'Ищу ответ…',
    sourceKb: 'Из базы знаний',
    sourceAi: 'AI + интернет',
    error: 'Ошибка. Попробуйте ещё раз.',
    empty: 'Спросите что-нибудь у помощника.',
  },
  en: {
    title: 'AI assistant',
    subtitle: 'Quick answers about managing your site',
    kbLabel: 'Frequently asked questions',
    inputPlaceholder: 'Type your question… (e.g. how do I connect a domain?)',
    send: 'Send',
    thinking: 'Looking for an answer…',
    sourceKb: 'From knowledge base',
    sourceAi: 'AI + web',
    error: 'Failed to get an answer. Please try again.',
    empty: 'Ask the assistant anything.',
  },
};

export function AssistantPanel({ locale }: Props) {
  const t = COPY[locale] ?? COPY.uz;

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Tayyor FAQ'larni KB'dan yuklash (auth talab qilmaydi)
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ faqs: FaqItem[] }>(`/ai/suggestions/?context=admin&lang=${locale}`)
      .then(res => {
        if (!cancelled && Array.isArray(res.data.faqs)) setFaqs(res.data.faqs);
      })
      .catch(() => {/* tarmoq xato — UI shartsiz ishlaydi */});
    return () => { cancelled = true; };
  }, [locale]);

  // Avtomatik scroll: yangi xabar kelganda pastga
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setErrorMsg(null);
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setPrompt('');
    setBusy(true);
    try {
      const res = await api.post<AssistResp>('/ai/admin-assist/', {
        prompt: trimmed,
        lang: locale,
      });
      const data = res.data;
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'ai', text: data.message, source: data.source },
        ]);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setErrorMsg(e.response?.data?.error ?? t.error);
    } finally {
      setBusy(false);
    }
  };

  const pickFaq = (faq: FaqItem) => {
    // Foydalanuvchi savolini chatga qo'yamiz, javobni esa darhol KB'dan ko'rsatamiz.
    setMessages(prev => [
      ...prev,
      { role: 'user', text: faq.question },
      { role: 'ai', text: faq.answer, source: 'kb' },
    ]);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden flex flex-col"
         style={{ minHeight: '70vh' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-purple-600/10 via-zinc-900 to-blue-600/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{t.title}</h2>
            <p className="text-[11px] text-zinc-400">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* FAQ kartochkalari (faqat suhbat bo'sh bo'lganda) */}
      {messages.length === 0 && faqs.length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> {t.kbLabel}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {faqs.map(f => (
              <motion.button
                key={f.id}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => pickFaq(f)}
                className="text-left px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 hover:border-purple-500/30 text-[12px] text-zinc-300 hover:text-white transition-colors"
              >
                {f.question}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Chat list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && faqs.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-10">{t.empty}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
              m.role === 'user'
                ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-200 border border-white/5',
            )}>
              {m.text}
              {m.role === 'ai' && m.source && (
                <div className="mt-1.5 text-[9px] uppercase tracking-wider opacity-60">
                  {m.source === 'kb' ? t.sourceKb : t.sourceAi}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2.5 text-xs text-zinc-400 bg-zinc-800 border border-white/5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t.thinking}
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/5 flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask(prompt);
            }
          }}
          placeholder={t.inputPlaceholder}
          className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed"
        />
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          disabled={!prompt.trim() || busy}
          onClick={() => void ask(prompt)}
          title={t.send}
          className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:opacity-40 flex items-center justify-center shadow-lg shadow-purple-500/20 transition-all"
        >
          <Send className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </div>
  );
}
