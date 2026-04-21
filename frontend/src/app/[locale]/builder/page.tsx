'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  CheckCircle2,
  Download,
  Layers,
  Loader2,
  MessageSquare,
  Monitor,
  MousePointer2,
  RefreshCw,
  Send,
  Settings,
  Smartphone,
  Sparkles,
  Wand2,
  Palette,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { SiteRenderer } from '@/features/builder/SiteRenderer';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';

// ── Types ──────────────────────────────────────────────────────────

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  phase?: 'ARCHITECT' | 'DONE';
}

interface DesignVariant {
  id: number;
  name: string;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  mood: string;
  font: string;
  layout: string;
  description: string;
  icon: string;
}

interface ApiResponse {
  success: boolean;
  phase?: 'ARCHITECT' | 'DONE';
  is_chat?: boolean;
  message?: string;
  architect_message?: string;
  design_variants?: DesignVariant[];
  project?: {
    id: string | null;
    title: string;
    status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED';
    schema_data: Record<string, unknown> | null;
  };
  error?: string;
}

// ── Design Variant Card ────────────────────────────────────────────

function DesignVariantCard({
  variant,
  onSelect,
}: {
  variant: DesignVariant;
  onSelect: (v: DesignVariant) => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(variant)}
      className="w-full text-left rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all group shadow-lg"
    >
      {/* Visual mockup */}
      <div
        className="h-28 relative overflow-hidden"
        style={{ backgroundColor: variant.bg }}
      >
        {/* Mock nav bar */}
        <div
          className="absolute top-0 left-0 right-0 h-6 flex items-center px-3 gap-1.5"
          style={{ backgroundColor: variant.primary }}
        >
          <div className="w-8 h-1.5 rounded-full opacity-80" style={{ backgroundColor: variant.accent }} />
          <div className="flex-1" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-5 h-1 rounded-full opacity-50" style={{ backgroundColor: variant.accent }} />
          ))}
        </div>

        {/* Mock hero section */}
        <div className="absolute top-8 left-0 right-0 px-3 pt-2">
          <div className="h-3 rounded-full w-3/4 mb-1.5 opacity-70" style={{ backgroundColor: variant.primary }} />
          <div className="h-2 rounded-full w-1/2 mb-3 opacity-40" style={{ backgroundColor: variant.primary }} />
          <div
            className="h-5 w-16 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: variant.accent }}
          >
            <div className="w-8 h-1.5 rounded-full bg-white opacity-80" />
          </div>
        </div>

        {/* Mock content blocks */}
        <div className="absolute bottom-2 left-3 right-3 flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 h-8 rounded-lg opacity-20"
              style={{ backgroundColor: variant.primary }}
            />
          ))}
        </div>

        {/* Mood overlay gradient */}
        <div
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${variant.primary}, ${variant.accent})`,
          }}
        />
      </div>

      {/* Info */}
      <div className="p-3 bg-zinc-900">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{variant.icon}</span>
          <span className="font-bold text-xs text-white">{variant.name}</span>
          <div className="flex gap-1 ml-auto">
            <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: variant.primary }} />
            <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: variant.accent }} />
            <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: variant.bg }} />
          </div>
        </div>
        <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">{variant.description}</p>
        <div className="mt-2 flex gap-1 flex-wrap">
          {variant.mood.split(',').slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: `${variant.primary}22`,
                color: variant.primary,
              }}
            >
              {tag.trim()}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

// ── Design Variants Panel ──────────────────────────────────────────

function DesignVariantsPanel({
  variants,
  onSelect,
}: {
  variants: DesignVariant[];
  onSelect: (v: DesignVariant) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-1 mb-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-lg bg-purple-600/30 flex items-center justify-center">
          <Palette className="w-3 h-3 text-purple-400" />
        </div>
        <span className="text-xs font-bold text-purple-300">Dizayn variantlarini tanlang</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {variants.map((v) => (
          <DesignVariantCard key={v.id} variant={v} onSelect={onSelect} />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-500 text-center">
        Variant tanlang yoki chat orqali o&apos;zgartiring
      </p>
    </motion.div>
  );
}

// ── Bubble ─────────────────────────────────────────────────────────

function ChatBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const isUser = msg.role === 'user';
  const isDone = msg.phase === 'DONE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5',
          isDone ? 'bg-emerald-600' : 'bg-gradient-to-tr from-blue-600 to-purple-600',
        )}>
          {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Zap className="w-3.5 h-3.5 text-white" />}
        </div>
      )}
      <div className={cn(
        'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
        isUser
          ? 'bg-purple-600 text-white rounded-br-sm'
          : isDone
            ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 rounded-bl-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm',
      )}>
        {msg.text}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 ml-2 mt-0.5 text-xs font-bold text-zinc-300">
          S
        </div>
      )}
    </motion.div>
  );
}

// ── Phase badge ────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: 'idle' | 'architect' | 'building' | 'done' }) {
  const map = {
    idle: { label: 'Tayyor', color: 'bg-zinc-800 text-zinc-400', icon: MessageSquare },
    architect: { label: 'Gemini rejimda', color: 'bg-blue-600/20 text-blue-300 border border-blue-500/30', icon: Zap },
    building: { label: 'Claude qurilmoqda…', color: 'bg-purple-600/20 text-purple-300 border border-purple-500/30', icon: Loader2 },
    done: { label: 'Sayt tayyor!', color: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30', icon: CheckCircle2 },
  };
  const { label, color, icon: Icon } = map[phase];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', color)}>
      <Icon className={cn('w-3 h-3', phase === 'building' && 'animate-spin')} />
      {label}
    </span>
  );
}

// ── AI Role Badge ──────────────────────────────────────────────────

function AIRoleBadge({ phase }: { phase: 'idle' | 'architect' | 'building' | 'done' }) {
  if (phase === 'building' || phase === 'done') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-600/10 border border-purple-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Claude</span>
        <span className="text-[9px] text-zinc-500">sayt yozmoqda</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-600/10 border border-blue-500/20">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Gemini</span>
      <span className="text-[9px] text-zinc-500">muloqot qilmoqda</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

export default function BuilderPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<'idle' | 'architect' | 'building' | 'done'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [designVariants, setDesignVariants] = useState<DesignVariant[] | null>(null);

  const { currentProject, setCurrentProject } = useProjectStore();
  const { isAuthenticated } = useAuthStore();
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages, isGenerating, designVariants]);

  useEffect(() => {
    setChatMessages([{
      role: 'ai',
      text: '👋 Salom! Men Gemini — sizning sayt arxitektoringizman.\n\nAvval bir nechta savol beraman, keyin Claude eng mos kodni yozib beradi.\n\nQanday biznes yoki loyiha uchun sayt kerak?',
    }]);
  }, []);

  const addMsg = (role: 'user' | 'ai', text: string, msgPhase?: ChatMessage['phase']) => {
    setChatMessages((prev) => [...prev, { role, text, phase: msgPhase }]);
  };

  const handleVariantSelect = (variant: DesignVariant) => {
    setDesignVariants(null);
    const variantMsg = `${variant.icon} "${variant.name}" variantini tanladim — ${variant.description}`;
    void handleSend(variantMsg);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? prompt).trim();
    if (!text || isGenerating) return;

    if (!overrideText) setPrompt('');
    addMsg('user', text);
    setErrorMsg('');
    setIsGenerating(true);

    const newHistory: HistoryItem[] = [
      ...history,
      { role: 'user', content: text },
    ];

    try {
      const body: Record<string, unknown> = {
        prompt: text,
        language: 'uz',
        history: newHistory,
      };
      if (currentProject?.id) {
        body.project_id = currentProject.id;
      }

      const res = await api.post<ApiResponse>('/projects/process_prompt/', body);
      const data = res.data;

      if (!data.success) {
        setErrorMsg(data.error ?? 'Xatolik yuz berdi.');
        addMsg('ai', `❌ ${data.error ?? 'Xatolik yuz berdi.'}`);
        setIsGenerating(false);
        return;
      }

      // Gemini arxitektor suhbat jarayonida
      if (data.phase === 'ARCHITECT' && data.is_chat) {
        const aiText = data.message ?? '...';
        addMsg('ai', aiText);
        setPhase('architect');
        setHistory([
          ...newHistory,
          { role: 'assistant', content: aiText },
        ]);
        // Dizayn variantlari kelsa ko'rsat
        if (data.design_variants && data.design_variants.length > 0) {
          setDesignVariants(data.design_variants);
        }
        setIsGenerating(false);
        return;
      }

      // Claude generatsiya tugadi
      if (data.phase === 'DONE' && data.project) {
        setPhase('building');
        if (data.architect_message) {
          const cleanMsg = data.architect_message
            .replace(/\[FINAL_SITE_SPEC\][\s\S]*?\[\/FINAL_SITE_SPEC\]/g, '')
            .replace(/\[DESIGN_VARIANTS\][\s\S]*?\[\/DESIGN_VARIANTS\]/g, '')
            .trim();
          if (cleanMsg) addMsg('ai', cleanMsg, 'DONE');
        }
        addMsg(
          'ai',
          `✅ Claude saytni yaratdi: «${data.project.title}»\n\nO'ngda preview ko'rinmoqda.\n\n📦 ZIP yuklab olsangiz Claude to'liq kod yozib beradi:\n• Frontend: HTML, CSS, JavaScript\n• Backend: Node.js + Express API\n• Contact form handler\n• README bilan`,
          'DONE',
        );
        setCurrentProject(data.project);
        setDesignVariants(null);
        setPhase('done');
        setHistory([]);
        setIsGenerating(false);
        return;
      }

      // Oddiy chat
      if (data.is_chat && data.message) {
        addMsg('ai', data.message);
        setHistory([
          ...newHistory,
          { role: 'assistant', content: data.message },
        ]);
        setIsGenerating(false);
        return;
      }

      setIsGenerating(false);

    } catch (err: unknown) {
      let msg = 'Server bilan ulanishda xato.';
      if (
        typeof err === 'object' && err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ) {
        msg = (err as { response: { data: { error: string } } }).response.data.error;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMsg(msg);
      addMsg('ai', `❌ ${msg}`);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setCurrentProject(null as unknown as Parameters<typeof setCurrentProject>[0]);
    setChatMessages([{
      role: 'ai',
      text: '🔄 Yangi sayt yaratishni boshlaylik!\n\nQanday biznes uchun sayt kerak?',
    }]);
    setHistory([]);
    setPhase('idle');
    setErrorMsg('');
    setDesignVariants(null);
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="h-14 border-b border-white/5 px-5 flex items-center justify-between bg-zinc-950/90 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </Link>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none">
              {currentProject?.title ?? 'AI Site Builder'}
            </h1>
            <PhaseBadge phase={phase} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
          <button onClick={() => setViewMode('desktop')}
            className={cn('p-2 rounded-lg transition-all', viewMode === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('mobile')}
            className={cn('p-2 rounded-lg transition-all', viewMode === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}>
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentProject && (
            <>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Yangidan
              </motion.button>
              <motion.button
                whileHover={{ scale: isDownloading ? 1 : 1.04 }}
                whileTap={{ scale: isDownloading ? 1 : 0.96 }}
                onClick={async () => {
                  if (!currentProject?.id || isDownloading) return;
                  setIsDownloading(true);
                  try {
                    const res = await api.get(`/projects/${currentProject.id}/download_zip/`, { responseType: 'blob' });
                    const url = URL.createObjectURL(res.data as Blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${currentProject.title}.zip`; a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    alert("ZIP yuklab bo'lmadi.");
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-70 rounded-xl text-xs font-semibold text-white transition-all shadow-lg shadow-purple-500/20 min-w-[130px] justify-center"
              >
                {isDownloading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claude kod yozmoqda…</>
                ) : (
                  <><Download className="w-3.5 h-3.5" /> ZIP yuklab ol</>
                )}
              </motion.button>
            </>
          )}
          {!isAuthenticated && (
            <Link href="/login">
              <Button size="sm" variant="outline" className="h-8 text-xs bg-white/5 border-white/10 text-zinc-300 rounded-xl">
                Kirish
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Sidebar */}
        <aside className="w-14 border-r border-white/5 flex flex-col items-center py-5 gap-5 bg-zinc-950 shrink-0">
          <button className="p-2.5 text-purple-400 bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20">
            <Layers className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl">
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl">
            <MessageSquare className="w-4 h-4" />
          </button>
          <div className="mt-auto">
            <button className="p-2.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-xl">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Preview */}
        <div className="flex-1 bg-zinc-900/40 overflow-auto p-6 flex justify-center items-start min-w-0">
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={cn(
              'bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[500px] border border-white/10',
              viewMode === 'desktop' ? 'w-full max-w-5xl' : 'w-[375px]',
            )}
          >
            <AnimatePresence mode="wait">
              {!currentProject ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-h-[500px] flex flex-col items-center justify-center p-16 text-center"
                >
                  {/* AI workflow diagram */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Gemini</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-zinc-500">loyiha rejasi</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Claude</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 + i * 0.15 }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-zinc-500">kod yozadi</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Download className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">ZIP</span>
                    </div>
                  </div>

                  <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-100 to-blue-50 flex items-center justify-center mb-6 shadow-inner"
                  >
                    <Wand2 className="w-10 h-10 text-purple-400" />
                  </motion.div>
                  <h2 className="text-2xl font-black text-zinc-900 mb-3">Sayt bu yerda paydo bo&apos;ladi</h2>
                  <p className="text-zinc-500 max-w-xs leading-relaxed text-sm">
                    Gemini loyiha rejasini tuzadi, Claude kodni yozadi, siz ZIP yuklab olasiz.
                  </p>
                  <div className="mt-6 flex gap-2 flex-wrap justify-center">
                    {["Cafe ☕", "Portfolio 🎨", "Do'kon 🛍️", "Klinika 🏥", "Restoran 🍽️"].map((ex) => (
                      <motion.button
                        key={ex}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setPrompt(`${ex} uchun sayt kerak`); textareaRef.current?.focus(); }}
                        className="px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-purple-300 hover:text-purple-700 transition-colors"
                      >
                        {ex}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-full overflow-auto"
                >
                  <SiteRenderer schema={currentProject.schema_data} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Chat */}
        <div className="w-[340px] border-l border-white/5 flex flex-col bg-zinc-950 shrink-0">

          {/* Chat header */}
          <div className="px-4 py-3.5 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">AI Arxitektor</h3>
                  <p className="text-[10px] text-zinc-500">Gemini → Claude pipeline</p>
                </div>
              </div>
              <AIRoleBadge phase={phase} />
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0">
            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} index={i} />
            ))}

            {/* Design variants panel */}
            <AnimatePresence>
              {designVariants && designVariants.length > 0 && (
                <DesignVariantsPanel variants={designVariants} onSelect={handleVariantSelect} />
              )}
            </AnimatePresence>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  phase === 'building'
                    ? 'bg-gradient-to-tr from-purple-600 to-pink-500'
                    : 'bg-gradient-to-tr from-blue-600 to-cyan-400',
                )}>
                  {phase === 'building'
                    ? <Bot className="w-3.5 h-3.5 text-white" />
                    : <Zap className="w-3.5 h-3.5 text-white" />
                  }
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  {phase === 'building'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /><span className="text-xs text-zinc-400">Claude kod yozmoqda…</span></>
                    : <>
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-xs text-zinc-500 ml-1">Gemini yozmoqda…</span>
                      </>
                  }
                </div>
              </motion.div>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mx-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="p-3 border-t border-white/5 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                placeholder={currentProject ? 'Tahrir yoki yangi so\'rov…' : 'Biznesingizni tasvirlab bering…'}
                rows={2}
                className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
              />
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => void handleSend()}
                disabled={isGenerating || !prompt.trim()}
                className="h-10 w-10 p-0 bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl shrink-0 flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[10px] text-zinc-700">
                Enter = yuborish · Shift+Enter = yangi qator
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-blue-500 font-bold">G</span>
                <span className="text-[9px] text-zinc-600">+</span>
                <span className="text-[9px] text-purple-500 font-bold">C</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
