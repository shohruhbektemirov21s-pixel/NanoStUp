import "server-only";

import { createHash } from "node:crypto";

import type { SchemaPlanTier } from "@/lib/ai/prompts-schema-spec";
import type { GenerateWebsiteSchemaOutput, WebsiteTemplateKind } from "@/lib/ai/website-generation.types";
import type { AppLocale } from "@/i18n/routing";

type CacheEntry = { expiresAtMs: number; value: GenerateWebsiteSchemaOutput };

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

function envTtlMs(): number {
  const raw = process.env.WEBSITE_GENERATE_CACHE_TTL_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 30_000 && n <= 3_600_000) {
    return n;
  }
  return 600_000;
}

function prune(now: number): void {
  if (store.size <= MAX_ENTRIES) {
    return;
  }
  const keys = Array.from(store.keys());
  for (const k of keys) {
    const e = store.get(k);
    if (!e || e.expiresAtMs < now) {
      store.delete(k);
    }
    if (store.size <= Math.floor(MAX_ENTRIES * 0.7)) {
      break;
    }
  }
}

export type WebsiteGenerateCacheFingerprintInput = {
  prompt: string;
  contentLocale: AppLocale;
  templateKind: WebsiteTemplateKind;
  planTier: SchemaPlanTier;
  /** conversationContext yoki contextTurns qatorlari */
  contextFingerprint: string;
};

export function websiteGenerateCacheKey(input: WebsiteGenerateCacheFingerprintInput): string {
  const payload = JSON.stringify({
    p: input.prompt.trim(),
    l: input.contentLocale,
    t: input.templateKind,
    tier: input.planTier,
    c: input.contextFingerprint,
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function getWebsiteGenerateCached(key: string): GenerateWebsiteSchemaOutput | null {
  const now = Date.now();
  const hit = store.get(key);
  if (!hit || hit.expiresAtMs < now) {
    if (hit) {
      store.delete(key);
    }
    return null;
  }
  return hit.value;
}

export function setWebsiteGenerateCached(key: string, value: GenerateWebsiteSchemaOutput): void {
  const now = Date.now();
  prune(now);
  store.set(key, { expiresAtMs: now + envTtlMs(), value });
}
