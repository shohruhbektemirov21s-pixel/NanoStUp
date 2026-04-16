"use client";

import React, { useEffect, useRef, useState } from "react";
import { WebsiteSchema } from "../../lib/schema/website";
import { Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";

interface PreviewFrameProps {
  schema: WebsiteSchema;
  activePageSlug: string;
}

export function PreviewFrame({ schema, activePageSlug }: PreviewFrameProps) {
  const [view, setView] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getWidth = () => {
    switch (view) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  // In a real production app, we would render a static HTML export or 
  // a specific Next.js route into the iframe. 
  // For this builder, we'll use a postMessage approach to update the iframe 
  // which will have a small "receiver" script.
  
  return (
    <div className="flex flex-col h-full bg-slate-100/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView("desktop")}
            className={`p-2 rounded-md transition-colors ${view === 'desktop' ? 'bg-slate-100 text-primary' : 'hover:bg-slate-50 text-slate-400'}`}
          >
            <Monitor size={18} />
          </button>
          <button 
            onClick={() => setView("tablet")}
            className={`p-2 rounded-md transition-colors ${view === 'tablet' ? 'bg-slate-100 text-primary' : 'hover:bg-slate-50 text-slate-400'}`}
          >
            <Tablet size={18} />
          </button>
          <button 
            onClick={() => setView("mobile")}
            className={`p-2 rounded-md transition-colors ${view === 'mobile' ? 'bg-slate-100 text-primary' : 'hover:bg-slate-50 text-slate-400'}`}
          >
            <Smartphone size={18} />
          </button>
        </div>
        
        <div className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          {schema.siteName || "Preview"} — {activePageSlug || "index"}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded select-none">
            {view === 'desktop' ? '1920 x 1080' : view === 'tablet' ? '768 x 1024' : '375 x 812'}
          </span>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 p-4 md:p-8 flex justify-center items-start overflow-auto custom-scrollbar">
        <div 
          style={{ width: getWidth(), transition: 'width 0.3s ease-in-out' }}
          className="bg-white shadow-2xl rounded-xl overflow-hidden min-h-full"
        >
          {/* 
              Target Route for Preview: /[locale]/preview 
              We'll implement this route next.
          */}
          <iframe 
            ref={iframeRef}
            src={`/preview?schema=${encodeURIComponent(JSON.stringify(schema))}&page=${activePageSlug}`}
            className="w-full h-full min-h-[800px] border-none"
            title="Website Preview"
          />
        </div>
      </div>
    </div>
  );
}
