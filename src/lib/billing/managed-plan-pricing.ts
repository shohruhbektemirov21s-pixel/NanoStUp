import { planBillingDiscountFactor } from "@/lib/billing/plan-discount";

export type ManagedPlanPriceFields = {
  priceMinor: number;
  discountPriceMinor: number | null;
  billingPeriodDays: number;
};

/** Bir tarif uchun M oy (30 kunlik oylar) + chegirma koeffitsienti bo‘yicha jami so‘m (butun). */
export function totalUzsWholeFromManagedPlan(plan: ManagedPlanPriceFields, months: number): number {
  const effectiveMinor = plan.discountPriceMinor ?? plan.priceMinor;
  const somPerPeriod = effectiveMinor / 100;
  const days = Math.max(1, plan.billingPeriodDays);
  const periods = (months * 30) / days;
  if (!Number.isFinite(periods) || periods < 0) {
    return 0;
  }
  return Math.max(0, Math.round(somPerPeriod * periods * planBillingDiscountFactor(months)));
}
