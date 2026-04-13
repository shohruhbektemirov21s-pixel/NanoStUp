# Website starter ZIP — file generator architecture

## Goals

- **Clean export**: one stylesheet link in HTML, one optional deferred router script (no duplicate `<script>` / `<link>` patterns).
- **Starter-ready**: `package.json`, root `README`, `.env.example`, `.gitignore`, deployment guide, reusable **partials** examples.
- **Single source of truth**: section HTML and multi-page router logic are shared between preview (`inline` script) and ZIP (`js/router.js`).

## Layout (this repo)

| Module | Responsibility |
|--------|------------------|
| `src/shared/lib/export-starter/html-sections.ts` | `renderHtmlSection()` — discriminated union → HTML (preview + export). |
| `src/shared/lib/export-starter/multi-page-router.ts` | `buildMultiPageRouterScriptSource(defaultSlug)` — IIFE string used inline or as `js/router.js`. |
| `src/shared/lib/export-starter/starter-static-files.ts` | Text generators: `package.json`, README, `.env.example`, `.gitignore`, `docs/DEPLOYMENT.md`, `partials/README.md`, example hero partial. |
| `src/shared/lib/export-starter/populate-website-starter-zip.ts` | `populateWebsiteStarterExportZip(zip, schema)` — wires all files into `JSZip`. |
| `src/shared/lib/build-preview-srcdoc.ts` | `buildSchemaMainInnerHtml(schema, { multiPageScript })` — `external` for ZIP HTML, default `inline` for iframe preview. |
| `src/shared/lib/build-website-zip.ts` | Thin entry: `buildWebsiteZipUint8Array` → `populateWebsiteStarterExportZip`. |

## ZIP directory tree

```text
index.html
styles.css
package.json
README.md
.env.example
.gitignore
js/router.js          # only if ≥ 2 pages
docs/DEPLOYMENT.md
partials/README.md
partials/examples/hero.example.html
assets/README.txt
```

## Extension plan (future)

1. **Optional Vite branch**: second export profile that emits `src/` + `index.html` template; keep current **zero-build** profile as default.
2. **Image pipeline**: copy optimized assets from schema URLs when present.
3. **i18n pack**: generate `README.<lang>.md` from `schema.language`.
4. **Automated tests**: assert ZIP tree + single `<link rel="stylesheet">` + router file presence for multi-page fixtures.

## Consumer flow

1. Unzip → `npm run dev` → edit `index.html` / `styles.css` / `partials/examples`.
2. Follow `docs/DEPLOYMENT.md` for hosting.
