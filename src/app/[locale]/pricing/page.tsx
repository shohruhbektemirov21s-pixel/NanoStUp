import { setRequestLocale } from "next-intl/server";

import { ensureDefaultManagedPlans } from "@/lib/admin/default-managed-plans";
import { PricingView } from "@/features/pricing/components/pricing-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function PricingPage({ params }: Readonly<{ params: P }>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  await ensureDefaultManagedPlans();
  const initialPlans = await prisma.managedSubscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      priceMinor: true,
      discountPriceMinor: true,
      billingPeriodDays: true,
      generationLimit: true,
      exportLimit: true,
    },
  });
  return <PricingView initialPlans={initialPlans} />;
}
