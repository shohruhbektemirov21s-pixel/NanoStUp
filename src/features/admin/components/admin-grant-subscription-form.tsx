"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ManagedPlanClientRow, UnifiedUserAdminRow } from "@/lib/admin/admin-dto";

type Props = {
  plans: ManagedPlanClientRow[];
  users: UnifiedUserAdminRow[];
};

export function AdminGrantSubscriptionForm({ plans, users }: Readonly<Props>) {
  const t = useTranslations("Admin");
  const [targetKind, setTargetKind] = useState<"telegram" | "web">("telegram");
  const [telegramUserId, setTelegramUserId] = useState("");
  const [webUserId, setWebUserId] = useState("");
  const [planSlug, setPlanSlug] = useState("");
  const [source, setSource] = useState<"PURCHASED" | "MANUAL">("MANUAL");
  const [priceMinor, setPriceMinor] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [durationMonths, setDurationMonths] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        label: `${u.fullName} · ${u.emailOrPhone} (${u.source})`,
        tg: u.telegramUserId,
        web: u.webUserId,
      })),
    [users],
  );

  const applyUserSelection = (value: string) => {
    const row = users.find((u) => u.rowKey === value);
    if (!row) {
      return;
    }
    if (row.telegramUserId) {
      setTargetKind("telegram");
      setTelegramUserId(row.telegramUserId);
      setWebUserId(row.webUserId ?? "");
    } else if (row.webUserId) {
      setTargetKind("web");
      setWebUserId(row.webUserId);
      setTelegramUserId("");
    }
  };

  const submit = async () => {
    if (!planSlug) {
      toast.error(t("grantNeedPlan"));
      return;
    }
    const priceParsed = priceMinor.trim() === "" ? null : Math.floor(Number(priceMinor));
    if (priceParsed != null && (!Number.isFinite(priceParsed) || priceParsed < 0)) {
      toast.error(t("toastInvalidNumber"));
      return;
    }
    const body: Record<string, unknown> = {
      planSlug,
      targetKind,
      source,
      adminNote: adminNote.trim() || undefined,
      priceAppliedMinor: priceParsed,
    };
    if (targetKind === "telegram") {
      body.telegramUserId = telegramUserId.trim();
    } else {
      body.webUserId = webUserId.trim();
    }
    const dDays = durationDays.trim() === "" ? null : Math.floor(Number(durationDays));
    if (dDays != null && Number.isFinite(dDays) && dDays > 0) {
      body.durationDays = dDays;
    }
    const mMonths = durationMonths.trim() === "" ? null : Math.floor(Number(durationMonths));
    if (mMonths != null && Number.isFinite(mMonths) && mMonths > 0) {
      body.durationMonths = mMonths;
    }
    if (startsAt.trim()) {
      body.startsAt = new Date(startsAt).toISOString();
    }
    if (endsAt.trim()) {
      body.endsAt = new Date(endsAt).toISOString();
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/managed-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t("toastError"));
        return;
      }
      toast.success(t("grantSaved"));
      window.location.reload();
    } catch {
      toast.error(t("toastError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("grantTitle")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("grantHint")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantPickUser")}
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            defaultValue=""
            onChange={(e) => applyUserSelection(e.target.value)}
          >
            <option value="">{t("grantPickPlaceholder")}</option>
            {users.map((u) => (
              <option key={u.rowKey} value={u.rowKey}>
                {u.fullName} · {u.source}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantTargetKind")}
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={targetKind}
            onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}
          >
            <option value="telegram">{t("grantTargetTelegram")}</option>
            <option value="web">{t("grantTargetWeb")}</option>
          </select>
        </label>
        {targetKind === "telegram" ? (
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 sm:col-span-2">
            {t("grantTelegramUserId")}
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
              value={telegramUserId}
              onChange={(e) => setTelegramUserId(e.target.value)}
              placeholder="cuid…"
            />
          </label>
        ) : (
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 sm:col-span-2">
            {t("grantWebUserId")}
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-950"
              value={webUserId}
              onChange={(e) => setWebUserId(e.target.value)}
              placeholder="cuid…"
            />
          </label>
        )}
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantPlan")}
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
          >
            <option value="">{t("grantPickPlaceholder")}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantSource")}
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
          >
            <option value="MANUAL">{t("grantSourceManual")}</option>
            <option value="PURCHASED">{t("grantSourcePurchased")}</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantPriceMinor")}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={priceMinor}
            onChange={(e) => setPriceMinor(e.target.value)}
            placeholder={t("grantPricePlaceholder")}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantDurationDays")}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantDurationMonths")}
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            placeholder="—"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantStartsAt")}
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {t("grantEndsAt")}
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 sm:col-span-2">
          {t("grantNote")}
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t("grantSubmit")}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{t("grantUserOptionsCount", { count: userOptions.length })}</p>
    </section>
  );
}
