const FEATURE_ICONS = new Set(["sparkles", "shield", "zap", "globe", "none"]);

function normalizeFeaturesItems(section: Record<string, unknown>): Record<string, unknown> {
  if (section.type !== "features" || !Array.isArray(section.items)) {
    return section;
  }
  const items = section.items.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }
    const row = { ...(item as Record<string, unknown>) };
    const ic = row.icon;
    if (typeof ic === "string" && !FEATURE_ICONS.has(ic)) {
      row.icon = "none";
    }
    return row;
  });
  return { ...section, items };
}

function normalizeSectionsArray(sections: unknown): unknown {
  if (!Array.isArray(sections)) {
    return sections;
  }
  return sections.map((sec) => {
    if (sec === null || typeof sec !== "object" || Array.isArray(sec)) {
      return sec;
    }
    return normalizeFeaturesItems({ ...(sec as Record<string, unknown>) });
  });
}

/**
 * Zod dan oldin keng tarqalgan model xatolarini yumshatish (faqat xavfsiz transformlar).
 */
export function preprocessWebsiteJsonCandidate(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const o = { ...(value as Record<string, unknown>) };

  if (typeof o.schemaVersion === "number") {
    o.schemaVersion = String(o.schemaVersion);
  }

  if (o.sections === null || o.sections === undefined) {
    o.sections = [];
  }

  if (o.seo !== null && typeof o.seo === "object" && !Array.isArray(o.seo)) {
    const seo = { ...(o.seo as Record<string, unknown>) };
    if (typeof seo.title === "string") {
      seo.title = seo.title.trim();
    }
    if (typeof seo.description === "string") {
      seo.description = seo.description.trim();
    }
    o.seo = seo;
  }

  if (typeof o.siteName === "string") {
    o.siteName = o.siteName.trim();
  }

  if (typeof o.language === "string") {
    o.language = o.language.trim();
  }

  if (o.theme !== null && typeof o.theme === "object" && !Array.isArray(o.theme)) {
    const t = { ...(o.theme as Record<string, unknown>) };
    for (const key of Object.keys(t)) {
      const v = t[key];
      if (typeof v === "string") {
        t[key] = v.trim();
      }
    }
    o.theme = t;
  }

  if (Array.isArray(o.pages)) {
    o.pages = o.pages.map((page) => {
      if (page === null || typeof page !== "object" || Array.isArray(page)) {
        return page;
      }
      const p = { ...(page as Record<string, unknown>) };
      if (typeof p.title === "string") {
        p.title = p.title.trim();
      }
      if (typeof p.slug === "string") {
        p.slug = p.slug.trim().toLowerCase();
      }
      if (typeof p.id === "string") {
        p.id = p.id.trim();
      }
      p.sections = normalizeSectionsArray(p.sections);
      return p;
    });
  }

  o.sections = normalizeSectionsArray(o.sections);

  if (
    (o.schemaVersion === "2" || o.schemaVersion === "3") &&
    Array.isArray(o.pages) &&
    o.pages.length >= 2 &&
    o.navigation === undefined
  ) {
    const items = (o.pages as Record<string, unknown>[])
      .map((p) => {
        const title = typeof p.title === "string" ? p.title.trim() : "Page";
        const slug = typeof p.slug === "string" ? p.slug.trim().toLowerCase() : "page";
        return { label: title, href: `/${slug}` };
      })
      .filter((row) => row.label.length > 0 && row.href.length > 1);
    if (items.length >= 2) {
      o.navigation = { items };
    }
  }

  return o;
}
