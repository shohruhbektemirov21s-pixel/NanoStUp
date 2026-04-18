'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Loader2, Monitor, Smartphone, Globe, Download, Settings, Layers, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/shared/api/axios';
import { useProjectStore } from '@/store/projectStore';
import { SiteRenderer } from '@/features/builder/SiteRenderer';
import { useTranslations } from 'next-intl';

export default function BuilderPage() {
  const t = useTranslations('Hero'); // Reusing some hero translations
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const { currentProject, setCurrentProject, incrementWorkers, decrementWorkers } = useProjectStore();
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerate = async () => {
    if (!prompt || isGenerating) return;
    
    if (!incrementWorkers()) {
      setErrorMessage('Too many active AI processes. Please wait.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    
    const timeoutId = setTimeout(() => {
      if (isGenerating) {
        setIsGenerating(false);
        decrementWorkers();
        setErrorMessage('Generation timed out. The system has stopped the process for safety.');
      }
    }, 60000);

    try {
      const response = await api.post('/projects/generate/', {
        prompt,
        title: 'New AI Website',
        language: 'en'
      });
      setCurrentProject(response.data);
    } catch (error: any) {
      console.error('Generation failed', error);
      setErrorMessage(error.response?.data?.detail || 'Generation failed. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      decrementWorkers();
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Premium Glass Header */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none mb-1">
              {currentProject?.title || 'AI Site Builder'}
            </h1>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Live Editor</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setViewMode('desktop')}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300", 
              viewMode === 'desktop' ? "bg-white/10 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('mobile')}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300", 
              viewMode === 'mobile' ? "bg-white/10 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl h-10 px-4 transition-all">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-white text-black hover:bg-zinc-200 rounded-xl h-10 px-5 font-bold shadow-xl shadow-white/5 active:scale-95 transition-all">
            Publish
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Modern Sidebar */}
        <aside className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-8 bg-zinc-950/50 backdrop-blur-md">
          <button className="p-3.5 text-purple-400 bg-purple-500/10 rounded-2xl ring-1 ring-purple-500/20 shadow-lg shadow-purple-500/10"><Layers className="w-6 h-6" /></button>
          <button className="p-3.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-2xl"><MousePointer2 className="w-6 h-6" /></button>
          <button className="p-3.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-2xl"><Globe className="w-6 h-6" /></button>
          <div className="mt-auto pb-4">
             <button className="p-3.5 text-zinc-600 hover:text-white transition-all hover:bg-white/5 rounded-2xl"><Settings className="w-6 h-6" /></button>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 bg-zinc-900/50 overflow-auto p-12 flex justify-center items-start relative">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none" />
          
          <motion.div 
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "bg-white rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden min-h-[600px] border border-white/10 relative",
              viewMode === 'desktop' ? "w-full max-w-5xl" : "w-[375px]"
            )}
          >
            <AnimatePresence mode="wait">
              {!currentProject ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-20 text-center"
                >
                  <div className="w-24 h-24 rounded-3xl bg-zinc-50 flex items-center justify-center mb-8 shadow-inner">
                    <Sparkles className="w-12 h-12 text-zinc-200" />
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">Design starts here</h2>
                  <p className="text-zinc-500 max-w-xs font-medium text-lg leading-relaxed">
                    Describe your vision in the prompt below to watch it come alive.
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-zinc-900 h-full overflow-auto selection:bg-purple-100"
                >
                  {currentProject.status === 'GENERATING' ? (
                    <div className="p-20 flex flex-col items-center justify-center min-h-[500px]">
                      <div className="relative mb-10">
                        <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse" />
                        <Loader2 className="w-16 h-16 animate-spin text-purple-600 relative" />
                      </div>
                      <h3 className="text-2xl font-black tracking-tight mb-4">Crafting brilliance...</h3>
                      <p className="text-zinc-500 text-center max-w-sm font-medium leading-relaxed">
                        Our AI is constructing your layout, generating copy, and refining every pixel.
                      </p>
                    </div>
                  ) : (
                    <SiteRenderer schema={currentProject.schema_data} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Modern Control Bar */}
      <footer className="p-8 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl relative z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-xl backdrop-blur-md"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition-opacity duration-500" />
            <div className="relative flex items-center bg-zinc-900 border border-white/5 rounded-[1.75rem] shadow-2xl overflow-hidden focus-within:border-white/10 transition-colors">
              <input 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Describe your site (e.g. 'A modern art gallery in Paris')"
                className="w-full bg-transparent h-16 px-8 outline-none text-zinc-200 placeholder:text-zinc-600 font-medium"
              />
              <div className="pr-3">
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="h-10 px-5 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      <span>Generate</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
