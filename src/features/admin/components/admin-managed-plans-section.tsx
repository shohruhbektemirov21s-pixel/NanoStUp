"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { ManagedPlanClientRow } from "@/lib/admin/admin-dto";

type Props = { initialPlans: ManagedPlanClientRow[] };

export function AdminManagedPlansSection({ initialPlans }: Readonly<Props>) {
  const t = useTranslations("Admin");
  const [plans, setPlans] = useState(initialPlans);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [priceMinor, setPriceMinor] = useState("0");

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/managed-plans");
    const data = (await res.json()) as { ok?: boolean; plans?: ManagedPlanClientRow[] };
    if (res.ok && data.ok && data.plans) {
      setPlans(data.plans);
    }
  }, []);

  const patch = async (id: string, patchBody: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/managed-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        toast.error(t("toastError"));
        return;
      }
      toast.success(t("toastSaved"));
      await reload();
    } catch {
      toast.error(t("toastError"));
    } finally {
      setBusyId(null);
    }
  };

  const create = async () => {
    const price = Math.floor(Number(priceMinor));
    if (!slug.trim() || !name.trim() || !Number.isFinite(price) || price < 0) {
      toast.error(t("toastInvalidNumber"));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/managed-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          priceMinor: price,
          billingPeriodDays: 30,
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        toast.error(t("toastError"));
        return;
      }
      toast.success(t("toastSaved"));
      setSlug("");
      setName("");
      setPriceMinor("0");
      await reload();
    } catch {
      toast.error(t("toastError"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("plansCreate")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t("plansSlug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            placeholder={t("plansName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              placeholder={t("plansPriceMinor")}
              value={priceMinor}
              onChange={(e) => setPriceMinor(e.target.value)}
            />
            <button
              type="button"
              disabled={creating}
              onClick={() => void create()}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t("plansAdd")}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("plansTitle")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-3">{t("plansColSlug")}</th>
                <th className="py-2 pr-3">{t("plansColName")}</th>
                <th className="py-2 pr-3">{t("plansColPrice")}</th>
                <th className="py-2 pr-3">{t("plansColDiscount")}</th>
                <th className="py-2 pr-3">{t("plansColPeriod")}</th>
                <th className="py-2 pr-3">{t("plansColGen")}</th>
                <th className="py-2 pr-3">{t("plansColExp")}</th>
                <th className="py-2 pr-3">{t("plansColActive")}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 font-mono text-xs">{p.slug}</td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-full min-w-[120px] rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      defaultValue={p.name}
                      key={`${p.id}-name`}
                      onBlur={(e) => {
                        if (e.target.value !== p.name) {
                          void patch(p.id, { name: e.target.value });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      defaultValue={p.priceMinor}
                      key={`${p.id}-price`}
                      onBlur={(e) => {
                        const n = Math.floor(Number(e.target.value));
                        if (Number.isFinite(n) && n !== p.priceMinor) {
                          void patch(p.id, { priceMinor: n });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      defaultValue={p.discountPriceMinor ?? ""}
                      key={`${p.id}-disc`}
                      placeholder="—"
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw === "" ? null : Math.floor(Number(raw));
                        if (raw === "" && p.discountPriceMinor == null) {
                          return;
                        }
                        if (n != null && !Number.isFinite(n)) {
                          return;
                        }
                        if (n !== p.discountPriceMinor) {
                          void patch(p.id, { discountPriceMinor: n });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      defaultValue={p.billingPeriodDays}
                      key={`${p.id}-period`}
                      onBlur={(e) => {
                        const n = Math.floor(Number(e.target.value));
                        if (Number.isFinite(n) && n > 0 && n !== p.billingPeriodDays) {
                          void patch(p.id, { billingPeriodDays: n });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      defaultValue={p.generationLimit ?? ""}
                      key={`${p.id}-gen`}
                      placeholder="∞"
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw === "" ? null : Math.floor(Number(raw));
                        if (raw === "" && p.generationLimit == null) {
                          return;
                        }
                        if (n != null && !Number.isFinite(n)) {
                          return;
                        }
                        if (n !== p.generationLimit) {
                          void patch(p.id, { generationLimit: n });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      defaultValue={p.exportLimit ?? ""}
                      key={`${p.id}-ex`}
                      placeholder="∞"
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const n = raw === "" ? null : Math.floor(Number(raw));
                        if (raw === "" && p.exportLimit == null) {
                          return;
                        }
                        if (n != null && !Number.isFinite(n)) {
                          return;
                        }
                        if (n !== p.exportLimit) {
                          void patch(p.id, { exportLimit: n });
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void patch(p.id, { isActive: !p.isActive })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      {busyId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : p.isActive ? t("plansActive") : t("plansInactive")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
