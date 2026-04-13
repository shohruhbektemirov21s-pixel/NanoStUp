"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { id: string; name: string; slug: string; status: string; updatedAt: string };

export function MiniProjectsClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/miniapp/projects", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; projects?: Row[]; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Xato");
        setRows([]);
        return;
      }
      setRows(data.projects ?? []);
    })();
  }, []);

  if (err) {
    return <p className="px-4 py-8 text-center text-sm text-destructive">{err}</p>;
  }
  if (rows === null) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Yuklanmoqda…</p>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Loyihalarim</h1>
        <p className="mt-1 text-sm text-muted-foreground">SaaS loyihalari (veb-builder).</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Hozircha loyiha yo‘q. Sayt yaratish bo‘limidan boshlang.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/miniapp/project/${encodeURIComponent(r.id)}`}
                className="block rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition hover:bg-muted/40"
              >
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.status} · {r.updatedAt.slice(0, 10)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
