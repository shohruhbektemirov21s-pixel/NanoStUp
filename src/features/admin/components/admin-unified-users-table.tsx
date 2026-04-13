"use client";

import { Loader2, LogOut, ShieldOff, ShieldPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import type { UnifiedUserAdminRow } from "@/lib/admin/admin-dto";

type Props = { users: UnifiedUserAdminRow[] };

export function AdminUnifiedUsersTable({ users }: Readonly<Props>) {
  const t = useTranslations("Admin");
  const [busy, setBusy] = useState<string | null>(null);
  const [pwdOpen, setPwdOpen] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("unifiedUsersTitle")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("unifiedUsersHint")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 pr-2">{t("uColName")}</th>
              <th className="py-2 pr-2">{t("uColContact")}</th>
              <th className="py-2 pr-2">{t("uColRole")}</th>
              <th className="py-2 pr-2">{t("uColRegistered")}</th>
              <th className="py-2 pr-2">{t("uColLastLogin")}</th>
              <th className="py-2 pr-2">{t("uColSource")}</th>
              <th className="py-2 pr-2">{t("uColSites")}</th>
              <th className="py-2 pr-2">{t("uColExports")}</th>
              <th className="py-2 pr-2">{t("uColPlan")}</th>
              <th className="py-2 pr-2">{t("uColSubStatus")}</th>
              <th className="py-2 pr-2">{t("uColSubPeriod")}</th>
              <th className="py-2 pr-2">{t("uColSubSource")}</th>
              <th className="py-2 pr-2">{t("uColActive")}</th>
              <th className="py-2">{t("uColActions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.rowKey} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-2 text-slate-800 dark:text-slate-200">{u.fullName}</td>
                <td className="max-w-[160px] truncate py-2 pr-2 text-xs" title={u.emailOrPhone}>
                  {u.emailOrPhone}
                </td>
                <td className="py-2 pr-2 text-xs">{u.role}</td>
                <td className="py-2 pr-2 whitespace-nowrap font-mono text-[10px] text-slate-600">{u.registeredAt.slice(0, 10)}</td>
                <td className="py-2 pr-2 whitespace-nowrap font-mono text-[10px] text-slate-600">
                  {u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : "—"}
                </td>
                <td className="py-2 pr-2 text-xs font-medium capitalize">{u.source}</td>
                <td className="py-2 pr-2">{u.sitesCount}</td>
                <td className="py-2 pr-2">{u.exportsCount}</td>
                <td className="py-2 pr-2 text-xs">{u.managedPlanName ?? u.legacyPlanLabel ?? "—"}</td>
                <td className="py-2 pr-2 text-xs">{u.managedStatus ?? "—"}</td>
                <td className="max-w-[140px] py-2 pr-2 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                  {u.managedStartsAt || u.managedEndsAt ? (
                    <>
                      {u.managedStartsAt ? u.managedStartsAt.slice(0, 10) : "—"} → {u.managedEndsAt ? u.managedEndsAt.slice(0, 10) : "—"}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-2 text-xs">{u.managedSource ?? "—"}</td>
                <td className="py-2 pr-2">{u.isActive ? "✓" : "✗"}</td>
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    {u.telegramUserId ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        disabled={busy === `${u.rowKey}-tg-out`}
                        onClick={() =>
                          void run(`${u.rowKey}-tg-out`, async () => {
                            const res = await fetch(`/api/admin/telegram-users/${u.telegramUserId}/force-logout`, {
                              method: "POST",
                            });
                            const data = (await res.json()) as { ok?: boolean };
                            if (!res.ok || !data.ok) {
                              toast.error(t("toastError"));
                              return;
                            }
                            toast.success(t("toastTgLogout"));
                          })
                        }
                      >
                        {busy === `${u.rowKey}-tg-out` ? <Loader2 className="size-3 animate-spin" /> : <LogOut className="size-3" />}
                        TG
                      </button>
                    ) : null}
                    {u.webUserId ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          disabled={busy === `${u.rowKey}-web-out`}
                          onClick={() =>
                            void run(`${u.rowKey}-web-out`, async () => {
                              const res = await fetch(`/api/admin/web-users/${u.webUserId}/force-logout`, { method: "POST" });
                              const data = (await res.json()) as { ok?: boolean };
                              if (!res.ok || !data.ok) {
                                toast.error(t("toastError"));
                                return;
                              }
                              toast.success(t("toastWebLogout"));
                            })
                          }
                        >
                          {busy === `${u.rowKey}-web-out` ? <Loader2 className="size-3 animate-spin" /> : <LogOut className="size-3" />}
                          Web
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          onClick={() => {
                            setPwdOpen(u.webUserId);
                            setPwd("");
                          }}
                        >
                          {t("uSetPwd")}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
                          disabled={busy === `${u.rowKey}-deact`}
                          onClick={() =>
                            void run(`${u.rowKey}-deact`, async () => {
                              const res = await fetch(`/api/admin/web-users/${u.webUserId}/account`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ isActive: !u.isActive }),
                              });
                              const data = (await res.json()) as { ok?: boolean };
                              if (!res.ok || !data.ok) {
                                toast.error(t("toastError"));
                                return;
                              }
                              toast.success(t("toastSaved"));
                              window.location.reload();
                            })
                          }
                        >
                          {busy === `${u.rowKey}-deact` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : u.isActive ? (
                            <ShieldOff className="size-3" />
                          ) : (
                            <ShieldPlus className="size-3" />
                          )}
                          {u.isActive ? t("uDeactivate") : t("uReactivate")}
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pwdOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t("uSetPwdTitle")}</h3>
            <p className="mt-1 text-xs text-slate-500">{t("uSetPwdHint")}</p>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setPwdOpen(null)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={busy === "pwd" || pwd.length < 12}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                onClick={() =>
                  void run("pwd", async () => {
                    const res = await fetch(`/api/admin/web-users/${pwdOpen}/password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ newPassword: pwd }),
                    });
                    const data = (await res.json()) as { ok?: boolean };
                    if (!res.ok || !data.ok) {
                      toast.error(t("toastError"));
                      return;
                    }
                    toast.success(t("toastPwdSet"));
                    setPwdOpen(null);
                    setPwd("");
                  })
                }
              >
                {busy === "pwd" ? <Loader2 className="size-4 animate-spin" /> : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
