"use client";

import { useTranslations } from "next-intl";

import type { AdminAuditLogClientRow } from "@/lib/admin/admin-dto";

type Props = { logs: AdminAuditLogClientRow[] };

function payloadPreview(p: unknown): string {
  if (p == null) {
    return "—";
  }
  try {
    return JSON.stringify(p).slice(0, 240);
  } catch {
    return String(p);
  }
}

export function AdminAuditLogSection({ logs }: Readonly<Props>) {
  const t = useTranslations("Admin");
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("auditTitle")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("auditHint")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 pr-3">{t("auditColWhen")}</th>
              <th className="py-2 pr-3">{t("auditColAction")}</th>
              <th className="py-2 pr-3">{t("auditColActor")}</th>
              <th className="py-2 pr-3">{t("auditColTarget")}</th>
              <th className="py-2 pr-3">{t("auditColPayload")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  —
                </td>
              </tr>
            ) : (
              logs.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">
                    {r.createdAt.slice(0, 19)}
                  </td>
                  <td className="py-2 pr-3 text-xs font-semibold text-violet-700 dark:text-violet-300">{r.action}</td>
                  <td className="py-2 pr-3 text-xs">{r.actor}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {r.targetTelegramUserId ? `tg:${r.targetTelegramUserId.slice(0, 10)}…` : null}
                    {r.targetWebUserId ? `web:${r.targetWebUserId.slice(0, 10)}…` : null}
                    {!r.targetTelegramUserId && !r.targetWebUserId ? "—" : null}
                  </td>
                  <td className="max-w-[320px] truncate py-2 pr-3 text-xs text-slate-500" title={payloadPreview(r.payload)}>
                    {payloadPreview(r.payload)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
