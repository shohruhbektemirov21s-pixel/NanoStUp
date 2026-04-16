"use client";

import React, { useState } from "react";
import { useBuilderStore } from "@/shared/store/builder-store";
import { BuilderSidebar } from "@/features/website-builder/BuilderSidebar";
import { PreviewFrame } from "@/features/preview-frame/PreviewFrame";
import { generateBlueprint } from "@/lib/ai/generate-blueprint";
import { generateWebsiteSchema } from "@/lib/ai/generate-schema";
import { patchWebsiteSchema } from "@/lib/ai/patch-schema";
import { Sparkles, Save, Download, ChevronLeft, Send } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function BuilderPage() {
  const { prompt, setPrompt, schema, setSchema, isGenerating, setGenerating, activePageSlug } = useBuilderStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Iltimos, sayt haqida qisqacha yozing");
      return;
    }

    setGenerating(true);
    try {
      toast.info("Blueprint tayyorlanmoqda...");
      const blueprint = await generateBlueprint(prompt);
      
      toast.info("Sayt schemasi yaratilmoqda...");
      const fullSchema = await generateWebsiteSchema(blueprint, prompt);
      
      setSchema(fullSchema);
      toast.success("Sayt muvaffaqiyatli yaratildi!");
    } catch (error: any) {
      console.error(error);
      toast.error("Xatolik yuz berdi: " + (error.message || "AI javob bermadi"));
    } finally {
      setGenerating(false);
    }
  };

  const [editPrompt, setEditPrompt] = useState("");
  const [isPatching, setIsPatching] = useState(false);

  const handleUpdate = async () => {
    if (!editPrompt.trim() || !schema) return;

    setIsPatching(true);
    try {
      toast.info("O'zgarishlar kiritilmoqda...");
      const updatedSchema = await patchWebsiteSchema(schema, editPrompt);
      setSchema(updatedSchema);
      setEditPrompt("");
      toast.success("O'zgarishlar saqlandi!");
    } catch (error) {
      toast.error("O'zgarishlarni kiritib bo'lmadi");
    } finally {
      setIsPatching(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900 border-t">
      <Toaster position="top-center" richColors />
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-80' : 'w-0'} border-r border-slate-200 transition-all duration-300 overflow-hidden flex flex-col bg-white z-20`}
      >
        <BuilderSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronLeft className={`transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
              {schema?.siteName || "Yangi Loyiha"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
              <Save size={16} />
              <span>Saqlash</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white hover:opacity-90 rounded-lg transition-all shadow-sm">
              <Download size={16} />
              <span>Eksport (ZIP)</span>
            </button>
          </div>
        </header>

        {/* Builder / Preview Tabs or View */}
        <div className="flex-1 overflow-hidden">
          {schema ? (
            <div className="flex-1 overflow-hidden relative h-full">
              <PreviewFrame schema={schema} activePageSlug={activePageSlug} />
              
              {/* Quick Edit Overlay */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
                 <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
                    <input 
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                      placeholder="Masalan: 'Rangini qizil qil' yoki 'Hero matnini o'zgartir'..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2"
                    />
                    <button 
                      onClick={handleUpdate}
                      disabled={isPatching || !editPrompt}
                      className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {isPatching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
                    </button>
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/50">
               <div className="max-w-2xl w-full text-center space-y-8">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary animate-pulse">
                      <Sparkles size={32} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                      O'z g'oyangizni saytga aylantiring
                    </h1>
                    <p className="text-lg text-slate-500">
                      Qisqa prompt yozing va biz sizga to'liq, professional va ko'p sahifali sayt yaratib beramiz.
                    </p>
                  </div>

                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Masalan: Yoshlar uchun zamonaviy kiyim do'koni..."
                        className="w-full h-32 p-4 text-lg border-none focus:ring-0 resize-none placeholder:text-slate-300"
                        disabled={isGenerating}
                      />
                      <div className="flex justify-end pt-4 border-t border-slate-50">
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !prompt.trim()}
                          className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-lg shadow-primary/20"
                        >
                          {isGenerating ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Yaratilmoqda...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={20} />
                              <span>Saytni yaratish</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    {["Restaurant", "Portfolio", "Landing Page", "SaaS"].map((tag) => (
                      <button 
                        key={tag}
                        onClick={() => setPrompt(`${tag} uchun zamonaviy sayt`)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
