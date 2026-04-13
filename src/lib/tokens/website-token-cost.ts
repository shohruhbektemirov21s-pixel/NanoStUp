import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";

/** Bir sahifali (v1 yoki yagona mantiq) loyiha. */
export const SINGLE_PAGE_TOKEN_COST = 10;

/** Ko‘p sahifali (v2, kamida 2 ta page) loyiha. */
export const MULTI_PAGE_TOKEN_COST = 50;

/** Bepul slotlar tugagach, ko‘p sahifali generatsiya uchun minimal balans. */
export const PAID_MULTI_GENERATION_THRESHOLD = MULTI_PAGE_TOKEN_COST;

/** Bugfix / iteratsiya. */
export const FIX_WEBSITE_TOKEN_COST = 12;

/**
 * 1 sahifa (v1) → 10 token; ko‘p sahifa (v2, 2+ page) → 50 token.
 */
export function computeWebsiteGenerationTokenCost(schema: WebsiteSchema): number {
  const isMulti =
    (schema.schemaVersion === "2" || schema.schemaVersion === "3") && (schema.pages?.length ?? 0) >= 2;
  if (!isMulti) {
    return SINGLE_PAGE_TOKEN_COST;
  }
  const n = schema.pages?.length ?? 0;
  if (n >= 8) {
    return 65;
  }
  if (n >= 6) {
    return 58;
  }
  return MULTI_PAGE_TOKEN_COST;
}
