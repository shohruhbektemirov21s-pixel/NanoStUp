"use client";

import Link from "next/link";
import { useState } from "react";

import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";
import { tryGetPublicAppBaseUrl } from "@/lib/public-app-url";

export function MiniBuilderClient() {
  const [prompt, setPrompt] = useState("");
  const [templateKind, setTemplateKind] = useState<"balanced" | "corporate" | "portfolio" | "landing">("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  const run = async () => {
    const p = prompt.trim();
    if (!p) {
      setError("Matn kiriting.");
      return;
    }
    setBusy(true);
    setError(null);
    setSiteId(null);
    try {
      const gen = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: p, locale: "uz", templateKind }),
      });
      const genJson = (await gen.json()) as { schema?: unknown; error?: string };
      if (!gen.ok || !genJson.schema) {
        setError(genJson.error ?? "Generatsiya muvaffaqiyatsiz.");
        return;
      }
      const save = await fetch("/api/miniapp/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schema: genJson.schema }),
      });
      const saveJson = (await save.json()) as { ok?: boolean; siteId?: string; error?: string };
      if (!save.ok || !saveJson.ok || !saveJson.siteId) {
        setError(saveJson.error ?? "Saqlash muvaffaqiyatsiz.");
        return;
      }
      setSiteId(saveJson.siteId);
    } catch {
      setError("Tarmoq xatosi.");
    } finally {
      setBusy(false);
    }
  };

  const webBase = tryGetPublicAppBaseUrl();

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Sayt yaratish</h1>
        <p className="mt-1 text-sm text-muted-foreground">Biznesingiz haqida qisqa yozing — AI sxema yaratadi va saqlaydi.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shablon</span>
        <select
          className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm"
          value={templateKind}
          onChange={(e) => setTemplateKind(e.target.value as typeof templateKind)}
        >
          <option value="balanced">Universal</option>
          <option value="corporate">Korporativ</option>
          <option value="portfolio">Portfolio</option>
          <option value="landing">Landing</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tavsif</span>
        <textarea
          className="min-h-[140px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed"
          maxLength={WEBSITE_PROMPT_MAX_CHARS}
          placeholder="Masalan: Toshkentda kofe va desertlar, yetkazib berish…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>

      {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-50"
      >
        {busy ? "Generatsiya…" : "AI bilan yaratish"}
      </button>

      {siteId ? (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Tayyor! Ko‘rish va tahrirlash:</p>
          <Link
            href={`/miniapp/preview?site=${encodeURIComponent(siteId)}`}
            className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
          >
            Ko‘rish (Mini App)
          </Link>
          {webBase ? (
            <a
              href={`${webBase}/uz/builder`}
              className="block rounded-xl border border-border bg-card py-3 text-center text-sm font-semibold"
            >
              Veb-saytda davom etish
            </a>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
