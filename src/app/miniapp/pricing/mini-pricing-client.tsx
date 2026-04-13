"use client";

import { useEffect, useState } from "react";

type Plan = {
  slug: string;
  name: string;
  priceMinor: number;
  discountPriceMinor: number | null;
  billingPeriodDays: number;
  generationLimit: number | null;
  exportLimit: number | null;
};

export function MiniPricingClient() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [me, setMe] = useState<{ subscription: unknown } | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, m] = await Promise.all([
        fetch("/api/miniapp/catalog/plans").then((r) => r.json() as Promise<{ ok?: boolean; plans?: Plan[] }>),
        fetch("/api/miniapp/me", { credentials: "include" }).then((r) => r.json() as Promise<{ ok?: boolean; profile?: { subscription?: unknown } }>),
      ]);
      if (p.ok && p.plans) {
        setPlans(p.plans);
      } else {
        setPlans([]);
      }
      if (m.ok && m.profile) {
        setMe({ subscription: m.profile.subscription });
      }
    })();
  }, []);

  const uzs = (minor: number) => (minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Tariflar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Obuna va limitlar — veb bilan bir xil katalog.</p>
      </div>

      {me?.subscription ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-primary">Joriy holat</p>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {JSON.stringify(me.subscription, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Obuna ma’lumoti yuklanmoqda yoki hozircha yo‘q.</p>
      )}

      <div className="space-y-3">
        {(plans ?? []).map((pl) => (
          <div key={pl.slug} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-lg font-bold">{pl.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {uzs(pl.discountPriceMinor ?? pl.priceMinor)} so‘m / {pl.billingPeriodDays} kun
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              AI: {pl.generationLimit ?? "∞"} · Eksport: {pl.exportLimit ?? "∞"}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">To‘lov hozircha asosan veb orqali (Payme). Tez orada Telegram.</p>
          </div>
        ))}
      </div>
    </main>
  );
}
