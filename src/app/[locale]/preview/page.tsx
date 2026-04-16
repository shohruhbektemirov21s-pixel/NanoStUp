"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WebsiteSchema } from "../../../lib/schema/website";
import { WebsiteRenderer } from "../../../features/website-renderer/WebsiteRenderer";

export default function PreviewPage() {
  const searchParams = useSearchParams();
  const [schema, setSchema] = useState<WebsiteSchema | null>(null);
  const activePageSlug = searchParams.get("page") || "";

  useEffect(() => {
    // 1. Try to get schema from URL (for initial load)
    const schemaParam = searchParams.get("schema");
    if (schemaParam) {
      try {
        setSchema(JSON.parse(decodeURIComponent(schemaParam)));
      } catch (e) {
        console.error("Failed to parse schema from URL");
      }
    }

    // 2. Listen for postMessage updates for real-time changes
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "UPDATE_SCHEMA") {
        setSchema(event.data.schema);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [searchParams]);

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium animate-pulse">Loading preview...</p>
        </div>
      </div>
    );
  }

  return <WebsiteRenderer schema={schema} activePageSlug={activePageSlug} />;
}
