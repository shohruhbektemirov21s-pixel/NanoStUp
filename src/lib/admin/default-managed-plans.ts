import "server-only";

import { prisma } from "@/lib/prisma";

const DEFAULTS = [
  { slug: "basic", name: "Basic", priceMinor: 0, billingPeriodDays: 30, generationLimit: 20, exportLimit: 5, sortOrder: 0 },
  { slug: "pro", name: "Pro", priceMinor: 9_900_000, billingPeriodDays: 30, generationLimit: 100, exportLimit: 30, sortOrder: 10 },
  { slug: "premium", name: "Premium", priceMinor: 19_900_000, billingPeriodDays: 30, generationLimit: 500, exportLimit: 100, sortOrder: 20 },
] as const;

export async function ensureDefaultManagedPlans(): Promise<void> {
  const count = await prisma.managedSubscriptionPlan.count();
  if (count > 0) {
    return;
  }
  for (const p of DEFAULTS) {
    await prisma.managedSubscriptionPlan.create({
      data: {
        slug: p.slug,
        name: p.name,
        priceMinor: p.priceMinor,
        billingPeriodDays: p.billingPeriodDays,
        generationLimit: p.generationLimit,
        exportLimit: p.exportLimit,
        sortOrder: p.sortOrder,
        isActive: true,
      },
    });
  }
}
