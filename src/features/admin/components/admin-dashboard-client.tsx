"use client";

import {
  CreditCard,
  LayoutDashboard,
  Loader2,
  Settings,
  Users,
  Eye,
  Check,
  X,
  Layers,
  Tags,
  ClipboardList,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { AdminAuditLogClientRow, AdminPlatformStatsClient, ManagedPlanClientRow, UnifiedUserAdminRow } from "@/lib/admin/admin-dto";
import { cn } from "@/lib/utils";

import { AdminAuditLogSection } from "./admin-audit-log-section";
import { AdminGrantSubscriptionForm } from "./admin-grant-subscription-form";
import { AdminManagedPlansSection } from "./admin-managed-plans-section";
import { AdminPlatformOverviewStats } from "./admin-platform-overview-stats";
import { AdminUnifiedUsersTable } from "./admin-unified-users-table";

export type AdminReceiptClientRow = {
  id: string;
  createdAt: string;
  suspiciousEdit: boolean;
  exifSoftware: string | null;
  hasExpectedPhone: boolean;
  hasExpectedAmount: boolean;
  hasPaymentCode: boolean;
  approvalStatus: string;
  originalFileName: string;
  billingAccountId: string | null;
  ocrWarnings: unknown;
};

export type AdminUserClientRow = {
  id: string;
  telegramId: string;
  firstName: string | null;
  username: string | null;
  sitesCount: number;
  subscriptions: { id: string; plan: string; siteTokenLimit: number; expiresAt: string | null }[];
};

export type AdminBillingClientRow = {
  id: string;
  tokenBalance: number;
  planTier: string;
  notifyTelegramId: string | null;
  subscriptionUntil: string | null;
};

export type AdminStats = {
  revenueTiyin: number;
  pendingReceipts: number;
  activeSubscriptions: number;
};

export type AdminSiteRow = { id: string; title: string; slug: string; telegramId: string };

type NavId = "overview" | "payments" | "users" | "subscriptions" | "plans" | "audit" | "settings";

type Props = {
  stats: AdminStats;
  receipts: AdminReceiptClientRow[];
  users: AdminUserClientRow[];
  billingAccounts: AdminBillingClientRow[];
  sites: AdminSiteRow[];
  platformStats: AdminPlatformStatsClient | null;
  unifiedUsers: UnifiedUserAdminRow[];
  managedPlans: ManagedPlanClientRow[];
  auditLogs: AdminAuditLogClientRow[];
};

function ocrWarningsText(raw: unknown): string {
  if (raw == null) {
    return "—";
  }
  if (Array.isArray(raw)) {
    return (raw as unknown[]).map(String).join(", ");
  }
  if (typeof raw === "object") {
    return JSON.stringify(raw);
  }
  return String(raw);
}

export function AdminDashboardClient({
  stats,
  receipts,
  users,
  billingAccounts,
  sites,
  platformStats,
  unifiedUsers,
  managedPlans,
  auditLogs,
}: Readonly<Props>) {
  const t = useTranslations("Admin");
  const [nav, setNav] = useState<NavId>("overview");
  const [preview, setPreview] = useState<{ id: string; url: string; name: string } | null>(null);
  const [approveOpen, setApproveOpen] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<"basic" | "pro" | "premium">("basic");
  const [months, setMonths] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const navItems = useMemo(
    () =>
      [
        { id: "overview" as const, icon: LayoutDashboard, label: t("navDashboard") },
        { id: "payments" as const, icon: CreditCard, label: t("navPayments") },
        { id: "users" as const, icon: Users, label: t("navUsers") },
        { id: "subscriptions" as const, icon: Layers, label: t("navSubscriptions") },
        { id: "plans" as const, icon: Tags, label: t("navPlans") },
        { id: "audit" as const, icon: ClipboardList, label: t("navAudit") },
        { id: "settings" as const, icon: Settings, label: t("navSettings") },
      ] satisfies { id: NavId; icon: typeof LayoutDashboard; label: string }[],
    [t],
  );

  const revenueUzs = useMemo(() => (stats.revenueTiyin / 100).toLocaleString(undefined, { maximumFractionDigits: 0 }), [stats]);

  const runApprove = useCallback(async () => {
    if (!approveOpen) {
      return;
    }
    setBusyId(approveOpen);
    try {
      const res = await fetch(`/api/admin/receipts/${approveOpen}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier, billingMonths: months }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t("toastError"));
        return;
      }
      toast.success(t("toastApproved"));
      window.location.reload();
    } catch {
      toast.error(t("toastError"));
    } finally {
      setBusyId(null);
      setApproveOpen(null);
    }
  }, [approveOpen, months, planTier, t]);

  const runReject = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const res = await fetch(`/api/admin/receipts/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          toast.error(data.error ?? t("toastError"));
          return;
        }
        toast.success(t("toastRejected"));
        window.location.reload();
      } catch {
        toast.error(t("toastError"));
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return (
    <div className="flex min-h-[calc(100vh-2rem)] gap-0 rounded-2xl border border-violet-200/40 bg-slate-50 shadow-xl dark:border-violet-900/40 dark:bg-slate-950">
      <aside className="flex w-56 shrink-0 flex-col bg-gradient-to-b from-violet-600 via-purple-700 to-indigo-900 px-3 py-8 text-white md:w-64">
        <div className="px-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200/90">{t("brandKicker")}</p>
          <p className="mt-1 text-lg font-bold tracking-tight">{t("brandTitle")}</p>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setNav(id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                nav === id ? "bg-white/15 text-white shadow-inner" : "text-violet-100 hover:bg-white/10",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-auto p-5 sm:p-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
          </div>
        </div>

        {nav === "overview" && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("statRevenue")}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{revenueUzs} so‘m</p>
                <p className="mt-1 text-xs text-slate-500">{t("statRevenueHint")}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("statPending")}
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingReceipts}</p>
                <p className="mt-1 text-xs text-slate-500">{t("statPendingHint")}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("statActiveSubs")}
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activeSubscriptions}</p>
                <p className="mt-1 text-xs text-slate-500">{t("statActiveSubsHint")}</p>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("platformStatsTitle")}
              </h2>
              <AdminPlatformOverviewStats stats={platformStats} />
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("sites")}</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="py-2 pr-3">{t("colTitle")}</th>
                      <th className="py-2 pr-3">{t("colSlug")}</th>
                      <th className="py-2">{t("colTelegram")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-slate-500">
                          —
                        </td>
                      </tr>
                    ) : (
                      sites.map((s) => (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">{s.title}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{s.slug}</td>
                          <td className="py-2 font-mono text-xs">{s.telegramId}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {nav === "payments" && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("navPayments")}</h2>
            {receipts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("receiptsEmpty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="py-2 pr-3">{t("colReceiptDate")}</th>
                      <th className="py-2 pr-3">{t("colStatus")}</th>
                      <th className="py-2 pr-3">{t("colAntiFraud")}</th>
                      <th className="py-2 pr-3">{t("colPhoneOk")}</th>
                      <th className="py-2 pr-3">{t("colAmountOk")}</th>
                      <th className="py-2 pr-3">{t("colCodeOk")}</th>
                      <th className="py-2 pr-3">{t("colWarnings")}</th>
                      <th className="py-2 pr-3">{t("colImage")}</th>
                      <th className="py-2">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                          {r.createdAt.slice(0, 19)}
                        </td>
                        <td className="py-2 pr-3 text-xs font-medium">
                          {r.approvalStatus === "approved" ? (
                            <span className="text-emerald-600">{t("statusApproved")}</span>
                          ) : r.approvalStatus === "rejected" ? (
                            <span className="text-rose-600">{t("statusRejected")}</span>
                          ) : (
                            <span className="text-amber-600">{t("statusPending")}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {r.suspiciousEdit ? (
                            <span className="block max-w-[200px] rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase leading-tight text-white">
                              {t("badgeFraudFake")}
                            </span>
                          ) : (
                            <span className="text-slate-400">{t("badgeOk")}</span>
                          )}
                          {r.exifSoftware ? (
                            <span className="mt-0.5 block max-w-[180px] truncate text-[10px] text-slate-500" title={r.exifSoftware}>
                              {r.exifSoftware}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">{r.hasExpectedPhone ? "✓" : "—"}</td>
                        <td className="py-2 pr-3">{r.hasExpectedAmount ? "✓" : "—"}</td>
                        <td className="py-2 pr-3">{r.hasPaymentCode ? "✓" : "—"}</td>
                        <td
                          className="py-2 pr-3 max-w-[180px] truncate text-xs text-amber-800 dark:text-amber-200"
                          title={ocrWarningsText(r.ocrWarnings)}
                        >
                          {ocrWarningsText(r.ocrWarnings)}
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline"
                            onClick={() =>
                              setPreview({
                                id: r.id,
                                url: `/api/admin/receipts/${r.id}/file`,
                                name: r.originalFileName,
                              })
                            }
                          >
                            <Eye className="size-3.5" aria-hidden />
                            {t("preview")}
                          </button>
                        </td>
                        <td className="py-2">
                          {r.approvalStatus === "pending" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                disabled={busyId === r.id}
                                onClick={() => {
                                  setPlanTier("basic");
                                  setMonths(1);
                                  setApproveOpen(r.id);
                                }}
                              >
                                {busyId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                {t("approve")}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
                                disabled={busyId === r.id}
                                onClick={() => void runReject(r.id)}
                              >
                                <X className="size-3.5" aria-hidden />
                                {t("reject")}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {nav === "users" && (
          <div className="space-y-8">
            <AdminUnifiedUsersTable users={unifiedUsers} />
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("users")}</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="py-2 pr-3">{t("colTelegram")}</th>
                      <th className="py-2 pr-3">{t("colUser")}</th>
                      <th className="py-2 pr-3">{t("colSites")}</th>
                      <th className="py-2 pr-3">{t("colSubTokenLimit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3 font-mono text-xs text-slate-700 dark:text-slate-300">{u.telegramId}</td>
                        <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">
                          {[u.firstName, u.username].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="py-2 pr-3">{u.sitesCount}</td>
                        <td className="py-2 pr-3">
                          {u.subscriptions.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {u.subscriptions.map((s) => (
                                <SubscriptionTokenEditor key={s.id} subscriptionId={s.id} initialLimit={s.siteTokenLimit} plan={s.plan} />
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("billingAccounts")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("billingAccountsHint")}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="py-2 pr-3">ID</th>
                      <th className="py-2 pr-3">{t("colPlan")}</th>
                      <th className="py-2 pr-3">Telegram (notify)</th>
                      <th className="py-2 pr-3">{t("colBillingTokens")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingAccounts.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3 font-mono text-[10px] text-slate-600">{b.id.slice(0, 12)}…</td>
                        <td className="py-2 pr-3">{b.planTier}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{b.notifyTelegramId ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <BillingTokenEditor billingId={b.id} initialBalance={b.tokenBalance} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {nav === "subscriptions" && (
          <div className="space-y-8">
            <AdminPlatformOverviewStats stats={platformStats} />
            <AdminGrantSubscriptionForm plans={managedPlans} users={unifiedUsers} />
          </div>
        )}

        {nav === "plans" && <AdminManagedPlansSection initialPlans={managedPlans} />}

        {nav === "audit" && <AdminAuditLogSection logs={auditLogs} />}

        {nav === "settings" && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            {t("settingsPlaceholder")}
          </div>
        )}
      </div>

      {preview ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
          aria-label={t("closePreview")}
        >
          <span
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic admin URL */}
            <img src={preview.url} alt={preview.name} className="max-h-[85vh] w-auto max-w-full object-contain" />
          </span>
        </button>
      ) : null}

      {approveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("approveTitle")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("approveSubtitle")}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">{t("fieldPlan")}</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value as typeof planTier)}
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">{t("fieldMonths")}</label>
              <input
                type="number"
                min={1}
                max={36}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value) || 1)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setApproveOpen(null)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                disabled={busyId === approveOpen}
                onClick={() => void runApprove()}
              >
                {busyId === approveOpen ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("confirmApprove")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubscriptionTokenEditor({
  subscriptionId,
  initialLimit,
  plan,
}: {
  subscriptionId: string;
  initialLimit: number;
  plan: string;
}) {
  const t = useTranslations("Admin");
  const [value, setValue] = useState(String(initialLimit));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      toast.error(t("toastInvalidNumber"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/token-limit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteTokenLimit: Math.floor(n) }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        toast.error(t("toastError"));
        return;
      }
      toast.success(t("toastSaved"));
    } catch {
      toast.error(t("toastError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/80">
      <span className="text-[10px] font-semibold uppercase text-slate-500">{plan}</span>
      <input
        className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-950"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="rounded bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "…" : t("save")}
      </button>
    </div>
  );
}

function BillingTokenEditor({ billingId, initialBalance }: { billingId: string; initialBalance: number }) {
  const t = useTranslations("Admin");
  const [value, setValue] = useState(String(initialBalance));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      toast.error(t("toastInvalidNumber"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/billing/${billingId}/tokens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenBalance: Math.floor(n) }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        toast.error(t("toastError"));
        return;
      }
      toast.success(t("toastSaved"));
    } catch {
      toast.error(t("toastError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="w-28 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-950"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="rounded bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "…" : t("save")}
      </button>
    </div>
  );
}
