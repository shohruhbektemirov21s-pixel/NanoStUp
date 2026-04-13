import type { WebsiteRegenerationPatch, SitePageMergePatch } from "./website-regeneration-patch.zod";
import type { SitePage, WebsiteSchema, WebsiteSection } from "./website-schema.zod";
import { sitePageSchema } from "./website-schema.zod";

function cloneSchema(base: WebsiteSchema): WebsiteSchema {
  if (typeof structuredClone === "function") {
    return structuredClone(base) as WebsiteSchema;
  }
  return JSON.parse(JSON.stringify(base)) as WebsiteSchema;
}

function stripRemovedSections(sections: WebsiteSection[], remove: Set<string>): WebsiteSection[] {
  return sections.filter((s) => !remove.has(s.id));
}

function upsertSections(existing: WebsiteSection[], incoming: WebsiteSection[]): WebsiteSection[] {
  const incomingById = new Map(incoming.map((s) => [s.id, s]));
  const existingIds = new Set(existing.map((s) => s.id));
  const replaced = existing.map((s) => incomingById.get(s.id) ?? s);
  const appended = incoming.filter((s) => !existingIds.has(s.id));
  return [...replaced, ...appended];
}

function mergePageFields(target: SitePage, patch: SitePageMergePatch): void {
  if (patch.title !== undefined) {
    target.title = patch.title;
  }
  if (patch.id !== undefined) {
    target.id = patch.id;
  }
  if (patch.seo !== undefined) {
    target.seo = {
      title: patch.seo.title ?? target.seo?.title ?? target.title,
      description: patch.seo.description ?? target.seo?.description ?? target.title,
    };
  }
}

/**
 * Bazaviy WebsiteSchema + LLM patch → birlashgan obyekt (Zod tekshiruvi keyin alohida).
 */
export function applyRegenerationPatch(base: WebsiteSchema, patch: WebsiteRegenerationPatch): WebsiteSchema {
  const merged = cloneSchema(base);
  const removeSlugs = new Set((patch.removePageSlugs ?? []).map((s) => s.trim().toLowerCase()));
  const removeSec = new Set(patch.removeSectionIds ?? []);

  if (patch.siteName !== undefined) {
    merged.siteName = patch.siteName;
  }
  if (patch.language !== undefined) {
    merged.language = patch.language;
  }
  if (patch.theme !== undefined) {
    merged.theme = { ...merged.theme, ...patch.theme };
  }
  if (patch.seo !== undefined) {
    merged.seo = {
      title: patch.seo.title ?? merged.seo.title,
      description: patch.seo.description ?? merged.seo.description,
    };
  }
  if (patch.navigation !== undefined) {
    merged.navigation = patch.navigation;
  }

  if (merged.schemaVersion === "1" && merged.sections?.length) {
    merged.sections = stripRemovedSections(merged.sections, removeSec);
  }

  if (merged.pages?.length) {
    merged.pages = merged.pages
      .filter((p) => !removeSlugs.has(p.slug.trim().toLowerCase()))
      .map((p) => ({
        ...p,
        sections: stripRemovedSections(p.sections, removeSec),
      }));
  } else if (merged.sections?.length) {
    merged.sections = stripRemovedSections(merged.sections, removeSec);
  }

  if (merged.schemaVersion === "1" && patch.sections?.length && merged.sections) {
    merged.sections = upsertSections(merged.sections, patch.sections);
  }

  const pages = merged.pages;
  if (!pages?.length) {
    return merged;
  }

  for (const pp of patch.pages ?? []) {
    const slugKey = pp.slug.trim().toLowerCase();
    const idx = pages.findIndex((p) => p.slug.trim().toLowerCase() === slugKey);

    if (idx === -1) {
      if (!pp.sections?.length) {
        continue;
      }
      const id = pp.id?.trim() || `page-${slugKey.replace(/[^a-z0-9_-]+/gi, "-")}`;
      const title = pp.title?.trim() || slugKey.charAt(0).toUpperCase() + slugKey.slice(1);
      const built = sitePageSchema.safeParse({
        id,
        slug: pp.slug.trim(),
        title,
        seo: pp.seo
          ? {
              title: pp.seo.title ?? title,
              description: pp.seo.description ?? `${title} — ${merged.siteName}`,
            }
          : undefined,
        sections: pp.sections,
      });
      if (built.success) {
        pages.push(built.data);
      }
      continue;
    }

    const page = pages[idx];
    mergePageFields(page, pp);

    if (pp.sections?.length) {
      if (pp.replaceSections) {
        page.sections = pp.sections;
      } else {
        page.sections = upsertSections(page.sections, pp.sections);
      }
    }
  }

  return merged;
}
