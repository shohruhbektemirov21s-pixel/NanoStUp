import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { getResolvedNavigationItems, getResolvedPages, type ResolvedSitePage } from "@/lib/ai/website-schema-pages";

import { renderHtmlSection } from "./export-starter/html-sections";
import { buildMultiPageRouterScriptSource } from "./export-starter/multi-page-router";
import { escapeAttr, escapeHtml } from "./escape-html";
import { DEFAULT_PREVIEW_PLACEHOLDER_LABELS, type PreviewPlaceholderLabels } from "./preview-placeholder-defaults";
import {
  platformDeveloperFooterCss,
  resolvePlatformFooterLang,
  wrapHtmlBodyWithPlatformFooter,
} from "./platform-developer-footer";

export type BuildSchemaMainOptions = {
  /** ZIP: tashqi `js/router.js`; preview: inline (iframe uchun). */
  multiPageScript?: "inline" | "external";
  /** Ko‘p sahifali sxemada dastlab ko‘rinadigan sahifa (hash router bilan). */
  initialPageSlug?: string;
};

function baseStyles(): string {
  return `
    :root {
      --primary: var(--c-primary);
      --secondary: var(--c-secondary);
      --accent: var(--c-accent);
      --bg: var(--c-bg);
      --surface: var(--c-surface);
      --text: var(--c-text);
      --muted: var(--c-muted);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
    }
    main { max-width: 960px; margin: 0 auto; padding: 24px 20px 48px; }
    .block { margin: 32px 0; }
    .hero { padding: 32px 0 8px; }
    .hero h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); margin: 0.35em 0; letter-spacing: -0.02em; }
    .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--text); font-size: 12px; font-weight: 600; margin: 0 0 12px; }
    .lead { color: var(--muted); font-size: 1.05rem; max-width: 60ch; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid transparent; }
    .btn.primary { background: var(--primary); color: #fff; }
    .btn.ghost { background: var(--surface); color: var(--text); border-color: color-mix(in srgb, var(--text) 12%, transparent); }
    .features h2, .cta h2, .contact h2 { font-size: 1.35rem; margin-bottom: 14px; }
    .grid { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card { background: var(--surface); border: 1px solid color-mix(in srgb, var(--text) 10%, transparent); border-radius: 14px; padding: 14px 16px; }
    .card h3 { margin: 0 0 6px; font-size: 1rem; }
    .card p { margin: 0; color: var(--muted); font-size: 0.92rem; }
    .cta { background: var(--surface); border-radius: 16px; padding: 22px; border: 1px solid color-mix(in srgb, var(--text) 10%, transparent); }
    .muted { color: var(--muted); margin-top: 0; }
    .contact-lines p { margin: 8px 0; }
    .label { display: inline-block; min-width: 88px; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .footer { border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); padding-top: 18px; color: var(--muted); }
    .tagline { font-weight: 600; color: var(--text); margin: 0 0 6px; }
    .small { font-size: 12px; margin: 0; }
    a { color: var(--accent); }
    .mp-nav {
      display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center;
      padding: 14px 18px; margin: 0 auto 22px; max-width: 960px;
      border-radius: 18px;
      background: color-mix(in srgb, var(--surface) 82%, transparent);
      border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
      box-shadow: 0 8px 32px color-mix(in srgb, var(--text) 6%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .mp-nav-link {
      padding: 9px 16px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 13px;
      color: var(--muted); transition: color 0.2s ease, background 0.2s ease;
    }
    .mp-nav-link:hover, .mp-nav-link--active {
      color: var(--text);
      background: color-mix(in srgb, var(--primary) 14%, transparent);
    }
    .mp-stack { max-width: 960px; margin: 0 auto; padding: 0 20px 48px; position: relative; }
    .mp-page {
      display: none;
      opacity: 0;
      transform: translateY(10px);
      animation: mpEnter 0.45s ease forwards;
    }
    .mp-page--active { display: block; opacity: 1; transform: none; }
    @keyframes mpEnter {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .price-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-top: 16px; }
    .price-card { background: var(--surface); border: 1px solid color-mix(in srgb, var(--text) 10%, transparent); border-radius: 14px; padding: 16px; }
    .price-card .price { font-size: 1.35rem; font-weight: 700; margin: 6px 0; }
    .price-card ul { margin: 10px 0 0; padding-left: 18px; color: var(--muted); font-size: 0.92rem; }
    .quote-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 14px; }
    .quote-card { background: var(--surface); border-radius: 14px; padding: 16px; border: 1px solid color-mix(in srgb, var(--text) 8%, transparent); }
    .quote-card footer { margin-top: 10px; font-size: 0.85rem; color: var(--muted); }
    .faq-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .faq-item { border: 1px solid color-mix(in srgb, var(--text) 10%, transparent); border-radius: 12px; padding: 10px 12px; background: var(--surface); }
    .faq-item summary { cursor: pointer; font-weight: 600; }
    .blog-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 12px; }
    .blog-card { background: var(--surface); border-radius: 12px; padding: 14px; border: 1px solid color-mix(in srgb, var(--text) 8%, transparent); }
    .trust-list { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 10px; }
    .trust-list li { background: color-mix(in srgb, var(--primary) 10%, transparent); padding: 8px 12px; border-radius: 999px; font-size: 0.9rem; }
    .stack-form { display: flex; flex-direction: column; gap: 10px; max-width: 420px; margin-top: 12px; }
    .stack-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--muted); }
    .stack-form input, .stack-form textarea { border-radius: 10px; border: 1px solid color-mix(in srgb, var(--text) 14%, transparent); padding: 8px 10px; font: inherit; }
    .gallery-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-top: 12px; }
    .gallery-card .ph { height: 120px; border-radius: 12px; background: color-mix(in srgb, var(--text) 8%, transparent); }
    .custom-body { white-space: pre-wrap; color: var(--muted); }
    ${platformDeveloperFooterCss()}
  `.trim();
}

function inferSlugForPreviewNav(href: string, pages: ResolvedSitePage[]): string | null {
  const first = pages[0]?.slug ?? "home";
  if (href.startsWith("#")) {
    const s = href.slice(1).split("/")[0];
    return s || first;
  }
  if (href.startsWith("/") && !href.startsWith("//")) {
    const s = href.replace(/^\/+/, "").split("/")[0]?.toLowerCase();
    if (s && pages.some((p) => p.slug === s)) {
      return s;
    }
  }
  return null;
}

function buildMultiPageMainInnerHtml(
  schema: WebsiteSchema,
  scriptMode: "inline" | "external",
  initialPageSlug?: string,
): string {
  const pages = getResolvedPages(schema);
  const defaultSlug = pages[0]?.slug ?? "home";
  const routerSlug =
    initialPageSlug && pages.some((p) => p.slug === initialPageSlug) ? initialPageSlug : defaultSlug;
  const navItems = getResolvedNavigationItems(schema);
  const nav = `<nav class="mp-nav" role="navigation" aria-label="${escapeAttr(schema.siteName)}">
    ${navItems
      .map((item, i) => {
        const isExternal = /^https?:\/\//i.test(item.href) || item.href.startsWith("mailto:") || item.href.startsWith("tel:");
        if (isExternal) {
          return `<a href="${escapeAttr(item.href)}" class="mp-nav-link mp-nav-link--external" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`;
        }
        const slug = inferSlugForPreviewNav(item.href, pages) ?? pages[i]?.slug ?? defaultSlug;
        const previewHref = `#${slug}`;
        const isActive = i === 0;
        return `<a href="${escapeAttr(previewHref)}" class="mp-nav-link${isActive ? " mp-nav-link--active" : ""}" data-nav="${escapeAttr(slug)}">${escapeHtml(item.label)}</a>`;
      })
      .join("")}
  </nav>`;
  const stack = pages
    .map(
      (p, i) => `<div class="mp-page${i === 0 ? " mp-page--active" : ""}" id="page-${escapeAttr(p.slug)}" data-page="${escapeAttr(p.slug)}" role="region" aria-label="${escapeHtml(p.title)}">
    ${p.sections.map((s) => renderHtmlSection(s)).join("\n")}
  </div>`,
    )
    .join("\n");
  const headBlock = `<header style="margin-bottom:12px;text-align:center">
    <p class="badge">${escapeHtml(schema.siteName)}</p>
    <p class="lead" style="margin:0 auto;max-width:56ch">${escapeHtml(schema.seo.description)}</p>
  </header>`;
  const script =
    scriptMode === "external"
      ? `<script src="./js/router.js" defer></script>`
      : `<script>${buildMultiPageRouterScriptSource(routerSlug)}</script>`;
  return `${headBlock}${nav}<div class="mp-stack">${stack}</div>${script}`;
}

export function buildThemeCssVars(schema: WebsiteSchema): string {
  const t = schema.theme;
  return `:root{--c-primary:${t.primary};--c-secondary:${t.secondary};--c-accent:${t.accent};--c-bg:${t.background};--c-surface:${t.surface};--c-text:${t.text};--c-muted:${t.mutedText};}`;
}

export function buildSchemaMainInnerHtml(schema: WebsiteSchema, options?: BuildSchemaMainOptions): string {
  const scriptMode = options?.multiPageScript ?? "inline";
  const pages = getResolvedPages(schema);
  if (pages.length >= 2) {
    return `<main class="site-multi">${buildMultiPageMainInnerHtml(schema, scriptMode, options?.initialPageSlug)}</main>`;
  }
  const sectionsHtml = (pages[0]?.sections ?? schema.sections).map((s) => renderHtmlSection(s)).join("\n");
  return `<main class="site-single">
    <header style="margin-bottom:8px">
      <p class="badge">${escapeHtml(schema.siteName)}</p>
      <p class="lead" style="margin:0">${escapeHtml(schema.seo.description)}</p>
    </header>
    ${sectionsHtml}
  </main>`;
}

export function buildExportStylesheet(schema: WebsiteSchema): string {
  return `${buildThemeCssVars(schema)}\n${baseStyles()}`;
}

export function buildExportIndexHtml(schema: WebsiteSchema): string {
  const footerLang = resolvePlatformFooterLang(schema.language);
  const body = wrapHtmlBodyWithPlatformFooter(
    buildSchemaMainInnerHtml(schema, { multiPageScript: "external" }),
    footerLang,
  );
  return `<!DOCTYPE html><html lang="${escapeAttr(schema.language)}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="description" content="${escapeAttr(schema.seo.description)}"/><title>${escapeHtml(schema.seo.title)}</title><link rel="stylesheet" href="./styles.css"/></head><body>${body}</body></html>`;
}

export function buildPlaceholderPreviewSrcDoc(
  labels: PreviewPlaceholderLabels = DEFAULT_PREVIEW_PLACEHOLDER_LABELS,
): string {
  const css = baseStyles();
  const main = `<main>
    <section class="hero">
      <p class="badge">${escapeHtml(labels.badge)}</p>
      <h1>${escapeHtml(labels.title)}</h1>
      <p class="lead">${escapeHtml(labels.lead)}</p>
    </section>
  </main>`;
  const body = wrapHtmlBodyWithPlatformFooter(main, "uz");
  return `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Preview</title><style>
    :root {
      --c-primary:#4f46e5;--c-secondary:#0ea5e9;--c-accent:#22c55e;--c-bg:#f8fafc;--c-surface:#ffffff;--c-text:#0f172a;--c-muted:#64748b;
    }
    ${css}
  </style></head><body>
    ${body}
    <script>
      document.addEventListener("click", function(e) {
        var a = e.target.closest("a");
        if (!a) return;
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) === "#") return;
        if (href.charAt(0) === "/" && !href.startsWith("//")) {
          e.preventDefault();
          var slug = href.substring(1).split("/")[0];
          if (slug) window.location.hash = slug;
          return;
        }
        e.preventDefault();
      });
    </script>
  </body></html>`;
}

export function buildPreviewSrcDoc(schema: WebsiteSchema, opts?: { initialPageSlug?: string }): string {
  const styleBlock = `${buildThemeCssVars(schema)}\n${baseStyles()}`;
  const footerLang = resolvePlatformFooterLang(schema.language);
  const body = wrapHtmlBodyWithPlatformFooter(
    buildSchemaMainInnerHtml(schema, { initialPageSlug: opts?.initialPageSlug }),
    footerLang,
  );
  return `<!DOCTYPE html><html lang="${escapeAttr(schema.language)}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(schema.seo.title)}</title><style>
    ${styleBlock}
  </style></head><body>
    ${body}
    <script>
      document.addEventListener("click", function(e) {
        var a = e.target.closest("a");
        if (!a) return;
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) === "#") return;
        if (href.charAt(0) === "/" && !href.startsWith("//")) {
          e.preventDefault();
          var slug = href.substring(1).split("/")[0];
          if (slug) window.location.hash = slug;
          return;
        }
        e.preventDefault();
      });
    </script>
  </body></html>`;
}
