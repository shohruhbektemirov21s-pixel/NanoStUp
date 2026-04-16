"use client";

import React from "react";
import { useBuilderStore } from "../../shared/store/builder-store";
import { 
  Type, 
  Layers, 
  Palette, 
  Settings, 
  Plus, 
  ChevronRight, 
  Layout, 
  Smartphone,
  MousePointer2,
  Trash2,
  GripVertical
} from "lucide-react";

export function BuilderSidebar() {
  const { schema, activePageSlug, setActivePage } = useBuilderStore();

  if (!schema) return null;

  const activePage = schema.pages.find(p => p.slug === activePageSlug) || schema.pages[0];

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Sozlamalar</h2>
        <p className="text-sm text-slate-500">Sayt tarkibi va ko'rinishini boshqaring</p>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* Pages Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} />
              Sahifalar
            </h3>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-1">
            {schema.pages.map((page) => (
              <button
                key={page.slug}
                onClick={() => setActivePage(page.slug)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${
                  (activePageSlug === page.slug || (!activePageSlug && page.slug === ""))
                    ? 'bg-primary/5 text-primary border-primary/10 border'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layout size={16} className={activePageSlug === page.slug ? 'text-primary' : 'text-slate-400'} />
                  <span>{page.title}</span>
                </div>
                {(activePageSlug === page.slug) && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
        </section>

        {/* Sections Listing */}
        {activePage && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <GripVertical size={14} />
                Bloklar
              </h3>
              <button className="text-[10px] font-bold text-primary hover:underline">
                HAMMASI
              </button>
            </div>
            <div className="space-y-2">
              {activePage.sections.map((section, idx) => (
                <div 
                  key={section.id}
                  className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Settings size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 capitalize truncate">{section.type.replace('-', ' ')}</p>
                      <p className="text-[10px] text-slate-400 truncate">{section.variant || "Standard"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 px-1.5 hover:bg-red-50 hover:text-red-500 rounded transition-colors text-slate-300">
                      <Trash2 size={12} />
                    </button>
                    <button className="p-1 px-1.5 hover:bg-slate-100 rounded transition-colors text-slate-300">
                      <MousePointer2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button className="w-full py-4 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 hover:border-primary/20 hover:text-primary hover:bg-primary/5 transition-all text-xs font-bold flex items-center justify-center gap-2">
                 <Plus size={14} />
                 YANGI BLOK QO'SHISH
              </button>
            </div>
          </section>
        )}

        {/* Style / DNA Section */}
        <section className="pt-4 border-t border-slate-100">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Palette size={14} />
              Dizayn DNA
            </h3>
            <div className="grid grid-cols-2 gap-2">
               <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">VISUAL STYLE</p>
                  <p className="text-xs font-bold text-slate-700 capitalize">{schema.designDNA.visualStyle.split('-')[0]}</p>
               </div>
               <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">COLOR MODE</p>
                  <p className="text-xs font-bold text-slate-700 capitalize">{schema.designDNA.colorMode.split('-')[0]}</p>
               </div>
            </div>
        </section>

      </div>

      {/* Bottom Actions */}
      <div className="p-6 border-t border-slate-100 bg-white">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm shadow-xl shadow-slate-200">
          <Smartphone size={16} />
          Publish Site
        </button>
      </div>
    </div>
  );
}
