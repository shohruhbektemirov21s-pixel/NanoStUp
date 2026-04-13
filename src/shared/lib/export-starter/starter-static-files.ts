import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";

import { escapeHtml } from "../escape-html";
import { slugifyNpmPackageName } from "../slugify";

function trimLines(s: string): string {
  return s.replace(/^\n+/, "").replace(/\n+$/, "");
}

export function buildStarterPackageJson(schema: WebsiteSchema): string {
  const name = slugifyNpmPackageName(schema.siteName);
  const obj = {
    name,
    version: "1.0.0",
    private: true,
    description: `Static marketing site: ${schema.siteName}`,
    scripts: {
      dev: "npx --yes serve@14 . -l 4173",
      start: "npx --yes serve@14 . -l 4173",
      preview: "npx --yes serve@14 . -l 4173",
    },
    engines: {
      node: ">=18",
    },
  };
  return `${JSON.stringify(obj, null, 2)}\n`;
}

export function buildStarterRootReadme(schema: WebsiteSchema): string {
  return trimLines(`
# ${schema.siteName}

Static export from **AI Website Builder** — no build step required.

## Quick start

\`\`\`bash
npm run dev
\`\`\`

Open **http://localhost:4173** (or the URL printed by \`serve\`).

## Project layout

| Path | Role |
|------|------|
| \`index.html\` | Main page + optional multi-page shell |
| \`styles.css\` | Theme variables + layout (single file — no duplicate CSS imports) |
| \`js/router.js\` | Hash router (only if this export has multiple pages) |
| \`partials/\` | **Reusable HTML snippets** — copy into \`index.html\` or split later |
| \`assets/\` | Images, favicon, fonts |
| \`docs/DEPLOYMENT.md\` | Hosting checklist |

## Editing

1. Text and structure: edit \`index.html\` (or duplicate blocks from \`partials/examples/\`).
2. Colors: edit CSS variables at the top of \`styles.css\`.
3. New images: place under \`assets/\` and reference as \`./assets/your-file.webp\`.

## Scripts

- \`npm run dev\` — local static server (\`serve\`, no \`node_modules\` install needed).

## License

Content is yours; footer retains platform attribution as exported.
`);
}

export function buildStarterEnvExample(): string {
  return trimLines(`
# Static site — no API keys required for this folder.
# Optional: document your own analytics or form endpoints here later.

# Example (uncomment if you add a client-side form handler):
# PUBLIC_FORM_ENDPOINT=https://example.com/api/lead

# Local preview port hint (used by documentation only; \`serve -l\` overrides):
# PORT=4173
`);
}

export function buildStarterGitignore(): string {
  return trimLines(`
.DS_Store
.env
.env.local
node_modules/
*.log
`);
}

export function buildStarterDeploymentDoc(): string {
  return trimLines(`
# Deployment guide

This folder is **static HTML + CSS + optional JS**. Any static host works.

## Pre-flight

- [ ] Replace placeholder links (e.g. \`hello@example.com\`) in \`index.html\`.
- [ ] Add \`favicon.ico\` or \`assets/favicon.svg\`.
- [ ] Compress images in \`assets/\` (WebP/AVIF).

## Vercel

1. Push this folder to a Git repository.
2. Import in [Vercel](https://vercel.com/) → Framework Preset: **Other**.
3. Build command: leave empty. Output directory: **.** (root) or set root to this folder.

## Netlify

1. Drag-and-drop the folder in [Netlify Drop](https://app.netlify.com/drop) **or** connect Git.
2. Build settings: no build, publish directory = \`.\`.

## Cloudflare Pages

1. Create a Pages project → upload assets or connect Git.
2. Build command: none. Build output: \`/\` (root).

## GitHub Pages

1. Repository → **Settings → Pages**.
2. Source: branch folder containing these files (often \`/docs\` or root).
3. Ensure \`index.html\` is at the published root (may require moving files into \`/docs\` per GitHub rules).

## Shared hosting (cPanel / FTP)

Upload all files preserving paths. Entry URL must resolve \`index.html\`.

## Custom domain + HTTPS

Use your registrar or host DNS; enable free TLS (Let’s Encrypt) in the host panel.
`);
}

export function buildStarterPartialsReadme(): string {
  return trimLines(`
# Reusable section snippets

These files are **not** loaded automatically — they are copy/paste references so you can:

- Split \`index.html\` into includes later (11ty, Vite, etc.)
- Reuse a hero / features / CTA pattern across pages

## Conventions

- Keep \`id="..."\` unique across the whole site.
- Use relative paths: \`./styles.css\`, \`./assets/logo.webp\`.
- After pasting into \`index.html\`, remove duplicate \`<link rel="stylesheet">\` lines (only **one** stylesheet link in \`<head>\`).
`);
}

export function buildStarterHeroPartialExample(schema: WebsiteSchema): string {
  return trimLines(`
<!-- Example: hero block — safe to merge into index.html -->
<section class="block hero" id="example-hero">
  <p class="badge">${escapeHtml(schema.siteName)}</p>
  <h1>Your headline</h1>
  <p class="lead">Short supporting line.</p>
  <div class="actions">
    <a class="btn primary" href="#contact">Primary</a>
    <a class="btn ghost" href="#about">Secondary</a>
  </div>
</section>
`);
}
