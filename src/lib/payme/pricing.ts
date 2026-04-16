import type { SchemaPlanTier } from "@/lib/ai/prompts-schema-spec";
import { planBillingDiscountFactor } from "@/lib/billing/plan-discount";

export type PaymePlanTier = SchemaPlanTier;

const BASE_USD: Record<PaymePlanTier, number> = {
  basic: 9,
  pro: 29,
  premium: 79,
};

export const discountFactor = planBillingDiscountFactor;

/** So‘m (butun birlik) — UI va chek uchun. */
export function uzsForPlanMonths(tier: PaymePlanTier, months: number): number {
  const rate = Number(process.env.PAYME_USD_TO_UZS_RATE ?? "12500");
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("PAYME_USD_TO_UZS_RATE invalid");
  }
  const factor = discountFactor(months);
  const usd = BASE_USD[tier] * months * factor;
  return Math.max(1, Math.round(usd * rate));
}

/** 1 so‘m = 100 tiyin (masalan 100 000 so‘m → 10 000 000 tiyin). */
export function uzsWholeToTiyin(soMWhole: number): number {
  return Math.round(soMWhole * 100);
}

/** To‘lovdan keyin qo‘shiladigan tokenlar (tarif × oy). */
export function tokensGrantedForPlanMonths(tier: PaymePlanTier, months: number): number {
  const perMonth: Record<PaymePlanTier, number> = {
    basic: 150,
    pro: 400,
    premium: 1000,
  };
  return Math.max(0, Math.round(perMonth[tier] * months));
}

export function parsePaymePlanTier(raw: unknown): PaymePlanTier | null {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "basic" || v === "pro" || v === "premium") {
    return v;
  }
  return null;
}

export function parseBillingMonths(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n < 1 || n > 24) {
    return null;
  }
  return n;
}
