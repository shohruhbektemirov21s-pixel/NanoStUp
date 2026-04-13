import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { getResolvedPages } from "@/lib/ai/website-schema-pages";

/**
 * Ichki `/slug` havolalari mavjud sahifalarga ishora qilishini tekshiradi (ogohlantirishlar).
 */
export function collectNavigationIntegrityWarnings(schema: WebsiteSchema): string[] {
  const warnings: string[] = [];
  if (!schema.navigation?.items?.length) {
    return warnings;
  }
  const slugs = new Set(
    getResolvedPages(schema).map((p) => p.slug.trim().toLowerCase()),
  );
  for (const item of schema.navigation.items) {
    const href = item.href.trim();
    if (!href.startsWith("/")) {
      continue;
    }
    const seg = href.replace(/^\/+/, "").split("/")[0]?.toLowerCase();
    if (!seg) {
      continue;
    }
    if (!slugs.has(seg)) {
      warnings.push(`navigation_href_missing_page:${href}`);
    }
  }
  return warnings;
}
