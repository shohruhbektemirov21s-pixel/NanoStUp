/** Reja: Basic — kengaytirilgan 6 sahifa; Pro/Premium — 8 sahifa (gallery + testimonials). */
export type SchemaPlanTier = "basic" | "pro" | "premium";

const SECTION_TYPES = `
Section types (use discriminated field "type"):
- hero: title, subtitle?, badge?, primaryCta?, secondaryCta? (href may be "/slug" or "#fragment")
- features: heading, items[{title, description, icon?}]
- pricing: heading, subheading?, tiers[{name, price, description, features[], cta?}]
- testimonials: heading, items[{quote, author, role?}]
- faq: heading, items[{question, answer}]
- blogTeaser: heading, posts[{title, summary, href}]
- textBlock: heading?, paragraphs[]
- trustStrip: heading?, bullets[]
- leadForm: heading, subheading?, fields["name"|"email"|"phone"|"message"][], endpointPlaceholder?
- gallery: heading, items[{title, description, imageAlt}]
- cta: title, description?, button
- contact: heading, email?, phone?, address?
- footer: tagline, copyright?
- custom: title?, body (plain text / short copy only — no HTML tags)

Top-level JSON:
{
  "schemaVersion": "3",
  "language": "must match target locale code (uz|ru|en)",
  "siteName": "...",
  "seo": { "title": "...", "description": "..." },
  "theme": { "primary","secondary","accent","background","surface","text","mutedText": "#RRGGBB" },
  "sections": [],
  "navigation": { "items": [{ "label": "...", "href": "/slug-or-https-url" }] },
  "pages": [ ... ]
}

Rules:
- "sections" MUST be [] when using pages (all blocks live in pages[].sections).
- Every section "id" UNIQUE across ALL pages.
- Every page slug UNIQUE, lowercase, [a-z0-9-]+.
- "navigation.items" MUST include every public page (same order as typical site nav) with internal hrefs like "/home", "/about", etc.
- Each page MAY include optional "seo": { "title", "description" } for that route.
- Colors only #RGB or #RRGGBB.
- Write full professional marketing copy for every section (no lorem ipsum).
- Do not output anything outside JSON.
`.trim();

/**
 * Basic: 6 ta sahifa. Pro/Premium: 8 ta sahifa.
 */
export function getWebsiteSchemaSpecForPlanTier(tier: SchemaPlanTier): string {
  const isExtended = tier === "pro" || tier === "premium";
  if (!isExtended) {
    return `
You receive a natural-language business description from the user.
Return ONLY one JSON object that matches the WebsiteSchema below (no markdown, no commentary).

ALWAYS use "schemaVersion": "3" and a multi-page "pages" array with EXACTLY 6 pages in this order:
1) slug "home" — hero + features + optional trustStrip
2) slug "about" — hero or textBlock + features (story/values)
3) slug "services" — features + cta (services you offer)
4) slug "pricing" — pricing section (at least 2 tiers)
5) slug "faq" — faq section (5–8 Q&A)
6) slug "contact" — contact + footer

Each page: { "id": "unique", "slug": "...", "title": "Nav label", "seo"?: { "title", "description" }, "sections": [ ... ] }

${SECTION_TYPES}
- Deliver exactly 6 pages as listed (slug names must match).
- Internal CTAs and nav hrefs must reference existing slugs (e.g. "/contact", "/pricing").
`.trim();
  }

  return `
You receive a natural-language business description from the user.
Return ONLY one JSON object that matches the WebsiteSchema below (no markdown, no commentary).

ALWAYS use "schemaVersion": "3" and a multi-page "pages" array with EXACTLY 8 pages:
1) home — hero + features + trustStrip
2) about — textBlock + features
3) services — features + cta
4) gallery — gallery section (visual showcase)
5) pricing — pricing tiers
6) testimonials — testimonials
7) faq — faq
8) contact — contact + footer

Each page: { "id": "unique", "slug": "...", "title": "...", "seo"?: { "title", "description" }, "sections": [ ... ] }

${SECTION_TYPES}
- Deliver exactly 8 pages; slug values must be exactly: home, about, services, gallery, pricing, testimonials, faq, contact.
- Include blogTeaser OR extra features on home ONLY if it strengthens the story (optional).
`.trim();
}

/** @deprecated faqat moslik uchun */
export const WEBSITE_SCHEMA_SPEC = getWebsiteSchemaSpecForPlanTier("basic");
