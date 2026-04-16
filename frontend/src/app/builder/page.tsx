'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Loader2, Monitor, Smartphone, Globe, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/shared/api/axios';
import { useProjectStore } from '@/store/projectStore';
import { SiteRenderer } from '@/features/builder/SiteRenderer';

export default function BuilderPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const { currentProject, setCurrentProject, updateStatus } = useProjectStore();

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const response = await api.post('/projects/generate/', {
        prompt,
        title: 'New AI Website',
        language: 'en'
      });
      setCurrentProject(response.data);
      // In a real app, we'd wait for WebSocket notifications here
    } catch (error) {
      console.error('Generation failed', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-white/5 px-4 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="font-semibold">{currentProject?.title || 'AI Builder'}</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('desktop')}
            className={cn("p-2 rounded-lg transition-colors", viewMode === 'desktop' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white")}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('mobile')}
            className={cn("p-2 rounded-lg transition-colors", viewMode === 'mobile' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white")}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white h-9">
            <Download className="w-4 h-4 mr-2" />
            Export ZIP
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-9">
            Publish
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Options */}
        <div className="w-16 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-zinc-950">
          <button className="p-3 text-purple-400 bg-purple-500/10 rounded-xl"><Globe className="w-6 h-6" /></button>
          <button className="p-3 text-zinc-500 hover:text-white transition-colors"><Settings className="w-6 h-6" /></button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-zinc-900 overflow-auto p-8 flex justify-center items-start">
          <div className={cn(
            "bg-white rounded-2xl shadow-2xl transition-all duration-700 overflow-hidden min-h-[500px]",
            viewMode === 'desktop' ? "w-full max-w-5xl" : "w-[375px]"
          )}>
            {!currentProject ? (
              <div className="h-full flex flex-col items-center justify-center p-20 text-zinc-400">
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-zinc-300" />
                </div>
                <h2 className="text-xl font-medium text-zinc-900 mb-2">Ready to create?</h2>
                <p className="text-center">Enter a prompt below and watch the AI build your site.</p>
              </div>
            ) : (
              <div className="text-zinc-900 h-full overflow-auto">
                {currentProject.status === 'GENERATING' ? (
                  <div className="p-20 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-6" />
                    <h3 className="text-xl font-bold">AI is crafting your site...</h3>
                    <p className="text-zinc-500 mt-2 text-center max-w-sm">
                      We're generating custom copy, selecting the perfect layout and refining the design for your prompt.
                    </p>
                  </div>
                ) : (
                  <SiteRenderer schema={currentProject.schema_data} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Bar - Input */}
      <footer className="p-6 border-t border-white/5 bg-zinc-950">
        <div className="max-w-4xl mx-auto relative">
          <input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Describe your website (e.g. 'A luxury restaurant in Tashkent called Orom'...)"
            className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 px-6 pr-16 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-500"
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="absolute right-3 top-3 w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl flex items-center justify-center transition-colors"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </footer>
    </div>
  );
}
