"use client";

import { Loader2, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { clientApiUrl } from "@/lib/client-api-url";
import { cn } from "@/lib/utils";

type TierId = "basic" | "pro" | "premium";

export function ManualReceiptSection() {
  const t = useTranslations("Dashboard.manualReceipt");
  const [months, setMonths] = useState(3);
  const [tier, setTier] = useState<TierId>("pro");
  const [code, setCode] = useState<string | null>(null);
  const [amountUzs, setAmountUzs] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifyTelegramId, setNotifyTelegramId] = useState("");

  const monthOptions = useMemo(() => [1, 3, 6, 9, 12], []);

  const issueCode = useCallback(async () => {
    setIssueLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(clientApiUrl("/api/receipts/issue-code"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, months }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        expectedAmountUzs?: number;
        expiresAt?: string;
      };
      if (!res.ok || !data.ok || !data.code) {
        setError(data.error === "builder_auth_required" ? t("errLogin") : t("errIssue"));
        setCode(null);
        return;
      }
      setCode(data.code);
      setAmountUzs(typeof data.expectedAmountUzs === "number" ? data.expectedAmountUzs : null);
      setExpiresAt(data.expiresAt ?? null);
      setMessage(t("issuedOk"));
    } catch {
      setError(t("errNetwork"));
    } finally {
      setIssueLoading(false);
    }
  }, [months, t, tier]);

  const submitReceipt = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }
      setSubmitLoading(true);
      setError(null);
      setMessage(null);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const tid = notifyTelegramId.replace(/\D/g, "").trim();
        if (tid) {
          fd.set("notify_telegram_id", tid);
        }
        const res = await fetch(clientApiUrl("/api/receipts/submit"), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          suspiciousEdit?: boolean;
          ocrWarnings?: string[];
        };
        if (!res.ok || !data.ok) {
          setError(data.error === "builder_billing_required" ? t("errBilling") : t("errSubmit"));
          return;
        }
        const parts: string[] = [];
        if (data.suspiciousEdit) {
          parts.push(t("warnSuspiciousMeta"));
        }
        if (Array.isArray(data.ocrWarnings) && data.ocrWarnings.length > 0) {
          parts.push(t("warnOcr", { list: data.ocrWarnings.join(", ") }));
        }
        setMessage(parts.length > 0 ? parts.join(" ") : t("submitOk"));
      } catch {
        setError(t("errNetwork"));
      } finally {
        setSubmitLoading(false);
      }
    },
    [notifyTelegramId, t],
  );

  return (
    <div className="mt-8 rounded-2xl border border-amber-200/60 bg-amber-50/40 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/25">
      <div className="flex items-start gap-3">
        <Receipt className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="text-xs font-semibold text-foreground">
              <span className="mb-1 block text-muted-foreground">{t("tier")}</span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TierId)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="basic">{t("tierBasic")}</option>
                <option value="pro">{t("tierPro")}</option>
                <option value="premium">{t("tierPremium")}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground">
              <span className="mb-1 block text-muted-foreground">{t("months")}</span>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void issueCode()}
              disabled={issueLoading}
              className="self-end rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-60"
            >
              {issueLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("issuing")}
                </span>
              ) : (
                t("issueBtn")
              )}
            </button>
          </div>

          {code ? (
            <div className="mt-4 rounded-xl border border-amber-300/70 bg-white/80 p-4 dark:border-amber-800/50 dark:bg-slate-950/60">
              <p className="text-xs font-bold uppercase text-muted-foreground">{t("yourCode")}</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-foreground">{code}</p>
              {amountUzs != null ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("expectedAmount", { amount: amountUzs.toLocaleString("uz-UZ") })}
                </p>
              ) : null}
              {expiresAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("expires", { date: new Date(expiresAt).toLocaleString() })}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">{t("commentHint", { code })}</p>
            </div>
          ) : null}

          <div className="mt-4">
            <label className="block text-xs font-semibold text-muted-foreground">{t("notifyTelegram")}</label>
            <input
              type="text"
              inputMode="numeric"
              value={notifyTelegramId}
              onChange={(e) => setNotifyTelegramId(e.target.value)}
              placeholder="123456789"
              className="mt-1 block w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("notifyTelegramHint")}</p>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-muted-foreground">{t("uploadLabel")}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={submitLoading}
              className={cn("mt-1 block w-full max-w-md text-sm", submitLoading && "opacity-60")}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                void submitReceipt(f);
              }}
            />
            {submitLoading ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("checking")}
              </p>
            ) : null}
          </div>

          {message ? <p className="mt-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
