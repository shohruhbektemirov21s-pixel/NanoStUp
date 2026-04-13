import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { DashboardBillingSync } from "@/features/dashboard/components/dashboard-billing-sync";
import { ManualReceiptSection } from "@/features/dashboard/components/manual-receipt-section";
import { DashboardTokenStrip } from "@/features/dashboard/components/dashboard-token-strip";
import { DashboardLogoutButton } from "@/features/dashboard/components/dashboard-logout-button";
import { isAdminSession } from "@/lib/admin/session";
import { getBuilderSessionPayload } from "@/lib/builder/builder-session";
import { prisma } from "@/lib/prisma";
import { saasElevatedPanel } from "@/components/ui/saas-surface";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type P = { locale: string } | Promise<{ locale: string }>;

function formatSubEnd(ms: number | null, locale: string): string {
  if (ms === null) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString();
  }
}

export default async function DashboardPage({ params }: Readonly<{ params: P }>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  const admin = isAdminSession();
  const builder = getBuilderSessionPayload();
  if (!admin && !builder) {
    redirect(`/${locale}/builder-login`);
  }

  let planKey = admin ? (process.env.ADMIN_AI_PLAN_TIER?.trim().toLowerCase() || "pro") : builder!.tier;
  let subEnd: number | null = admin ? null : builder!.subscriptionUntilMs;

  if (!admin && builder?.billingId) {
    const acc = await prisma.billingAccount.findUnique({ where: { id: builder.billingId } });
    if (acc?.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
      const raw = acc.planTier.trim().toLowerCase();
      planKey = raw === "premium" ? "premium" : raw === "pro" ? "pro" : "basic";
      subEnd = acc.subscriptionUntil.getTime();
    }
  }

  const planLabel =
    planKey === "premium" ? t("planPremium") : planKey === "pro" ? t("planPro") : t("planBasic");
  const showBuilderLogout = Boolean(builder);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      {!admin && builder ? <DashboardBillingSync /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-prose text-muted-foreground">{t("subtitle")}</p>
          {admin ? <p className="mt-2 text-sm font-medium text-primary">{t("adminMode")}</p> : null}
        </div>
        <DashboardLogoutButton show={showBuilderLogout} />
      </div>

      <dl className={cn("mt-10 grid gap-6 p-6 sm:grid-cols-2 sm:p-8", saasElevatedPanel)}>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("planLabel")}</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{planLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("subscriptionUntil")}</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{formatSubEnd(subEnd, locale)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("tokensLabel")}</dt>
          <dd className="mt-3">
            <DashboardTokenStrip />
          </dd>
        </div>
      </dl>

      {!admin && builder ? <ManualReceiptSection /> : null}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("backBuilder")}
        </Link>
      </p>
    </div>
  );
}
