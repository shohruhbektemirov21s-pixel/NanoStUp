'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Loader2, Monitor, Smartphone, Globe, Download, Settings, Layers, MousePointer2, User, Bot, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import api from '@/shared/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { SiteRenderer } from '@/features/builder/SiteRenderer';
import { useTranslations } from 'next-intl';

export default function BuilderPage() {
  const t = useTranslations('Builder');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { isAuthenticated } = useAuthStore();
  const { currentProject, setCurrentProject, incrementWorkers, decrementWorkers } = useProjectStore();
  const [errorMessage, setErrorMessage] = useState('');

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [chatHistory]);

  const handleProcess = async () => {
    if (!prompt || isProcessing) return;
    if (!incrementWorkers()) { setErrorMessage('Iltimos kuting...'); return; }

    setIsProcessing(true);
    setErrorMessage('');
    const originalPrompt = prompt;
    setPrompt('');

    try {
      const response = await api.post('projects/process_prompt/', {
        prompt: originalPrompt,
        project_id: currentProject?.id || null,
        language: 'uz'
      });

      const data = response.data;
      if (!data.success) {
         setErrorMessage(data.error || 'AI vaqtincha ishlamayapti');
         return;
      }

      if (data.is_chat) {
        setChatHistory(prev => [...prev, { role: 'user', text: originalPrompt }, { role: 'bot', text: data.message }]);
      } else {
        setCurrentProject(data.project);
        setChatHistory(prev => [...prev, { role: 'user', text: originalPrompt }, { role: 'bot', text: "Sayt muvaffaqiyatli yangilandi! ✨" }]);
      }
    } catch (error: any) {
      setErrorMessage('AI vaqtincha ishlamayapti');
    } finally {
      setIsProcessing(false);
      decrementWorkers();
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">{currentProject?.title || 'AI Website Builder'}</h1>
            <div className="flex items-center gap-2">
               <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isProcessing ? "bg-amber-500" : "bg-emerald-500")} />
               <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">{isProcessing ? 'AI javob bermoqda...' : 'Tayyor'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentProject && (
             <Button onClick={() => window.location.href=`/api/projects/${currentProject.id}/download_zip/`} variant="outline" size="sm" className="bg-white/5 border-white/10 text-zinc-400 rounded-xl h-9">Download ZIP</Button>
          )}
          <Button size="sm" className="bg-white text-black rounded-xl h-9 px-5 font-bold">Publish</Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-white/5 flex flex-col bg-zinc-950/50">
           <div className="p-6 border-b border-white/5 font-bold text-zinc-400 flex items-center gap-2 tracking-tight"><MessageSquare className="w-4 h-4" /> AI Muloqot</div>
           <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
              {chatHistory.map((chat, i) => (
                <div key={i} className={cn("flex gap-3 max-w-[90%]", chat.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", chat.role === 'user' ? "bg-purple-600/20 text-purple-400" : "bg-white/10 text-zinc-400")}>
                    {chat.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn("p-3 rounded-2xl text-xs leading-relaxed", chat.role === 'user' ? "bg-purple-600 text-white shadow-lg" : "bg-white/5 text-zinc-300")}>{chat.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
           </div>
        </aside>

        <div className="flex-1 bg-zinc-900/50 overflow-auto p-12 flex justify-center items-start relative bg-[url('/grid.svg')] bg-repeat">
           <motion.div layout className={cn("bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden min-h-[600px] border border-white/10 relative transition-all duration-700", viewMode === 'desktop' ? "w-full max-w-5xl" : "w-[375px]")}>
             <AnimatePresence mode="wait">
               {!currentProject ? (
                  <div className="h-full flex flex-col items-center justify-center p-20 text-center text-zinc-900">
                     <Sparkles className="w-12 h-12 text-zinc-200 mb-6" />
                     <h2 className="text-4xl font-black mb-6 tracking-tight">Qanday sayt xohlaysiz?</h2>
                     <p className="text-zinc-500 max-w-sm mb-8">AI bilan suhbatlashing yoki yangi sayt yarating.</p>
                  </div>
               ) : (
                  <SiteRenderer schema={currentProject.schema_data} />
               )}
             </AnimatePresence>
           </motion.div>
        </div>
      </main>

      <footer className="p-8 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl z-20">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence>
             {errorMessage && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-3 rounded-2xl flex items-center gap-3">
                 <AlertCircle className="w-4 h-4" /> <span className="text-sm font-bold">{errorMessage}</span>
               </motion.div>
             )}
          </AnimatePresence>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition-opacity" />
            <div className={cn("relative flex items-center bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl", isProcessing && "opacity-50 pointer-events-none")}>
              <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleProcess()} placeholder="Sayt yarating yoki savol so'rang..." className="w-full bg-transparent h-14 px-6 outline-none text-zinc-200 placeholder:text-zinc-600" />
              <div className="pr-3">
                <Button onClick={handleProcess} disabled={isProcessing || !prompt} className="h-10 px-6 bg-white text-black hover:bg-zinc-200 rounded-xl font-extrabold flex items-center gap-3 active:scale-95 transition-all">
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Yuborish</span><Send className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
