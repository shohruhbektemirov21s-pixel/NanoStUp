import type { WebsiteSchema, WebsiteSection } from "./website-schema.zod";

export type ResolvedSitePage = {
  id: string;
  slug: string;
  title: string;
  /** Sahifa SEO — bo‘lsa preview `<title>` uchun */
  seo?: { title: string; description: string };
  sections: WebsiteSection[];
};

function isMultiPageVersion(v: WebsiteSchema["schemaVersion"]): boolean {
  return v === "2" || v === "3";
}

/**
 * Ko‘rinish / eksport: v2/v3 `pages` yoki v1 `sections` (bitta virtual sahifa).
 */
export function getResolvedPages(schema: WebsiteSchema): ResolvedSitePage[] {
  if (isMultiPageVersion(schema.schemaVersion) && schema.pages && schema.pages.length >= 2) {
    return schema.pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      seo: p.seo,
      sections: p.sections,
    }));
  }
  return [
    {
      id: "home",
      slug: "home",
      title: "Home",
      sections: schema.sections,
    },
  ];
}

export function isMultiPageSchema(schema: WebsiteSchema): boolean {
  return getResolvedPages(schema).length >= 2;
}

/**
 * Navbar: `navigation` bo‘lsa ishlatiladi, aks holda sahifalar ro‘yxatidan.
 */
export function getResolvedNavigationItems(schema: WebsiteSchema): { label: string; href: string }[] {
  if (schema.navigation?.items?.length) {
    return schema.navigation.items.map((i) => ({ label: i.label, href: i.href }));
  }
  const pages = getResolvedPages(schema);
  return pages.map((p) => ({
    label: p.title,
    href: pages.length >= 2 ? `#${p.slug}` : "/",
  }));
}
