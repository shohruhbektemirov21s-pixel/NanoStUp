"use client";

import { useEffect, useState } from "react";

import { tryGetPublicAppBaseUrl } from "@/lib/public-app-url";

export function MiniAccountClient() {
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/miniapp/me", { credentials: "include" });
      const text = await res.text();
      setRaw(text);
    })();
  }, []);

  const web = tryGetPublicAppBaseUrl();

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Akkaunt</h1>
        <p className="mt-1 text-sm text-muted-foreground">Telegram profil va obuna — xavfsiz ma’lumot.</p>
      </div>
      {raw ? (
        <pre className="max-h-[420px] overflow-auto rounded-2xl border border-border bg-muted/30 p-4 text-xs leading-relaxed">
          {(() => {
            try {
              return JSON.stringify(JSON.parse(raw) as object, null, 2);
            } catch {
              return raw;
            }
          })()}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      )}
      {web ? (
        <a
          href={`${web}/uz/builder`}
          className="block rounded-2xl border border-border bg-card py-4 text-center text-sm font-semibold shadow-sm"
        >
          Veb-kabinetga o‘tish
        </a>
      ) : null}
    </main>
  );
}
