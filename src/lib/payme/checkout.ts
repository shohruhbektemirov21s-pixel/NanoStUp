import "server-only";

import type { PaymePlanTier } from "@/lib/payme/pricing";
import { uzsForPlanMonths, uzsWholeToTiyin } from "@/lib/payme/pricing";

const CHECKOUT_BASE = (process.env.PAYME_CHECKOUT_BASE ?? "https://checkout.paycom.uz").replace(/\/$/, "");

export type CheckoutParams = {
  merchantId: string;
  amountTiyin: number;
  billingAccountId: string;
  planTier: PaymePlanTier;
  billingMonths: number;
  returnUrl?: string;
  lang?: "uz" | "ru" | "en";
};

/**
 * Payme GET cheki: `https://checkout.paycom.uz/base64(m=...;ac.user_id=...;a=...;c=...)`
 * @see https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get/
 */
export function buildPaymeCheckoutUrl(p: CheckoutParams): string {
  const parts: string[] = [
    `m=${p.merchantId}`,
    `ac.user_id=${encodeURIComponent(p.billingAccountId)}`,
    `ac.plan=${encodeURIComponent(p.planTier)}`,
    `ac.months=${encodeURIComponent(String(p.billingMonths))}`,
    `a=${p.amountTiyin}`,
  ];
  if (p.returnUrl) {
    parts.push(`c=${encodeURIComponent(p.returnUrl)}`);
  }
  if (p.lang) {
    parts.push(`l=${p.lang}`);
  }
  const raw = parts.join(";");
  const b64 = Buffer.from(raw, "utf8").toString("base64");
  return `${CHECKOUT_BASE}/${b64}`;
}

export function computeCheckoutAmountTiyin(tier: PaymePlanTier, months: number): { uzs: number; tiyin: number } {
  const uzs = uzsForPlanMonths(tier, months);
  return { uzs, tiyin: uzsWholeToTiyin(uzs) };
}
