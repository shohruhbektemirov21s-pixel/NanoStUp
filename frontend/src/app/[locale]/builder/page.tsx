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

interface ApiResponse {
  success: boolean;
  phase?: 'ARCHITECT' | 'DONE';
  is_chat?: boolean;
  message?: string;
  architect_message?: string;
  project?: {
    id: string | null;
    title: string;
    status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED';
    schema_data: Record<string, unknown> | null;
  };
  error?: string;
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
          isDone ? 'bg-emerald-600' : 'bg-purple-600',
        )}>
          {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
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
    architect: { label: 'Arxitektor rejimda', color: 'bg-purple-600/20 text-purple-300 border border-purple-500/30', icon: Wand2 },
    building: { label: 'Sayt qurilmoqda…', color: 'bg-blue-600/20 text-blue-300 border border-blue-500/30', icon: Loader2 },
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

// ── Main page ──────────────────────────────────────────────────────

export default function BuilderPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<'idle' | 'architect' | 'building' | 'done'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Arxitektor suhbat tarixi (backend uchun)
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const { currentProject, setCurrentProject } = useProjectStore();
  const { user, isAuthenticated } = useAuthStore();
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages, isGenerating]);

  // Boshlang'ich arxitektor tavsifi
  useEffect(() => {
    setChatMessages([{
      role: 'ai',
      text: '👋 Salom! Men sizning sayt arxitektoringizman.\n\nMen avval bir nechta savol beraman, keyin eng mos saytni yarataman.\n\nQanday biznes yoki loyiha uchun sayt kerak?',
    }]);
  }, []);

  const addMsg = (role: 'user' | 'ai', text: string, msgPhase?: ChatMessage['phase']) => {
    setChatMessages((prev) => [...prev, { role, text, phase: msgPhase }]);
  };

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    addMsg('user', text);
    setPrompt('');
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

      // Arxitektor suhbat jarayonida
      if (data.phase === 'ARCHITECT' && data.is_chat) {
        const aiText = data.message ?? '...';
        addMsg('ai', aiText);
        setPhase('architect');
        setHistory([
          ...newHistory,
          { role: 'assistant', content: aiText },
        ]);
        setIsGenerating(false);
        return;
      }

      // Generatsiya tugadi
      if (data.phase === 'DONE' && data.project) {
        // Arxitektor yakuniy xabar ham bo'lishi mumkin
        if (data.architect_message) {
          const cleanMsg = data.architect_message
            .replace(/\[FINAL_SITE_SPEC\][\s\S]*?\[\/FINAL_SITE_SPEC\]/g, '')
            .trim();
          if (cleanMsg) addMsg('ai', cleanMsg, 'DONE');
        }
        addMsg('ai', `✅ Sayt yaratildi: «${data.project.title}»\n\nO'ngda preview ko'rinmoqda. Tahrirlash uchun yangi ko'rsatma yuboring.`, 'DONE');
        setCurrentProject(data.project);
        setPhase('done');
        // Revise rejimiga o'tish uchun tarixni tozalaymiz
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
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="h-14 border-b border-white/5 px-5 flex items-center justify-between bg-zinc-950/90 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
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
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={async () => {
                  if (!currentProject?.id) return;
                  try {
                    const res = await api.get(`/projects/${currentProject.id}/download_zip/`, { responseType: 'blob' });
                    const url = URL.createObjectURL(res.data as Blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${currentProject.title}.zip`; a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert("ZIP yuklab bo'lmadi."); }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-semibold text-white transition-colors">
                <Download className="w-3.5 h-3.5" /> ZIP
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
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-100 to-blue-50 flex items-center justify-center mb-6 shadow-inner"
                  >
                    <Wand2 className="w-10 h-10 text-purple-400" />
                  </motion.div>
                  <h2 className="text-2xl font-black text-zinc-900 mb-3">Sayt bu yerda paydo bo&apos;ladi</h2>
                  <p className="text-zinc-500 max-w-xs leading-relaxed text-sm">
                    O&apos;ngdagi chat panelida Arxitektor AI bilan gaplashing — u saytni sizning xohishingizga qarab yaratadi.
                  </p>
                  <div className="mt-6 flex gap-2 flex-wrap justify-center">
                    {['Cafe', 'Portfolio', 'Do\'kon', 'Klinika'].map((ex) => (
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
        <div className="w-80 border-l border-white/5 flex flex-col bg-zinc-950 shrink-0">

          {/* Chat header */}
          <div className="px-4 py-3.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Arxitektor AI</h3>
                <p className="text-[10px] text-zinc-500">Sayt dizayni bo&apos;yicha maslahat</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 min-h-0">
            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} index={i} />
            ))}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  {phase === 'building'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /><span className="text-xs text-zinc-400">Sayt qurilmoqda…</span></>
                    : <>
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
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
                placeholder={currentProject ? 'Tahrir yoki yangi so\'rov…' : 'Yozing yoki misol tanlang…'}
                rows={2}
                className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed"
              />
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => void handleSend()}
                disabled={isGenerating || !prompt.trim()}
                className="h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl shrink-0 flex items-center justify-center transition-colors"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
              Enter = yuborish · Shift+Enter = yangi qator
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
