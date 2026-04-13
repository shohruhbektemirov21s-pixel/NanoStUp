/**
 * Fayl nomi / slug uchun xavfsiz qator (ZIP eksport va DB slug).
 */
export function slugifySiteFileName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04FF-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "website";
}

/**
 * `package.json` → `name` maydoni uchun (ASCII, npm qoidalari yaqin).
 */
export function slugifyNpmPackageName(name: string): string {
  const base = slugifySiteFileName(name)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let s = base.length > 0 ? base : "exported-site";
  if (/^\d/.test(s)) {
    s = `site-${s}`;
  }
  if (s.length > 214) {
    s = s.slice(0, 214).replace(/-+$/g, "") || "exported-site";
  }
  return s;
}

