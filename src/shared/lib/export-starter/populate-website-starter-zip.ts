import JSZip from "jszip";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { getResolvedPages } from "@/lib/ai/website-schema-pages";

import { buildExportIndexHtml, buildExportStylesheet } from "../build-preview-srcdoc";
import { buildMultiPageRouterScriptSource } from "./multi-page-router";
import {
  buildStarterDeploymentDoc,
  buildStarterEnvExample,
  buildStarterGitignore,
  buildStarterHeroPartialExample,
  buildStarterPackageJson,
  buildStarterPartialsReadme,
  buildStarterRootReadme,
} from "./starter-static-files";

const ASSETS_README = `Place static files here:
- images (logo, gallery)
- favicon.ico / favicon.svg
- fonts (if any)
`;

/**
 * ZIP obyektiga production-starter fayllarini yozadi (idempotent chaqiruvlar uchun avval shu yo‘llarni tozalash shart emas — yangi ZIP har safar yangi).
 */
export function populateWebsiteStarterExportZip(zip: InstanceType<typeof JSZip>, schema: WebsiteSchema): void {
  const pages = getResolvedPages(schema);
  const defaultSlug = pages[0]?.slug ?? "home";

  zip.file("index.html", buildExportIndexHtml(schema));
  zip.file("styles.css", buildExportStylesheet(schema));

  zip.file("package.json", buildStarterPackageJson(schema));
  zip.file("README.md", buildStarterRootReadme(schema));
  zip.file(".env.example", buildStarterEnvExample());
  zip.file(".gitignore", buildStarterGitignore());
  zip.file("docs/DEPLOYMENT.md", buildStarterDeploymentDoc());
  zip.file("partials/README.md", buildStarterPartialsReadme());
  zip.file("partials/examples/hero.example.html", buildStarterHeroPartialExample(schema));
  zip.file("assets/README.txt", ASSETS_README);

  if (pages.length >= 2) {
    zip.file("js/router.js", buildMultiPageRouterScriptSource(defaultSlug));
  }
}
