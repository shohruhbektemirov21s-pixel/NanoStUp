import type JSZip from "jszip";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { getResolvedPages } from "@/lib/ai/website-schema-pages";

import { buildExportStylesheet } from "../build-preview-srcdoc";
import { renderHtmlSection } from "../export-starter/html-sections";

/**
 * Statik eksport (`output: "export"`) bilan ishlaydigan minimal Next.js 14 loyihasi.
 * Har bir sahifa `PAGE_BODIES` orqali serverda HTML sifatida beriladi (mavjud `renderHtmlSection` bilan mos).
 */
export function populateNextExportZip(zip: InstanceType<typeof JSZip>, schema: WebsiteSchema): void {
  const pages = getResolvedPages(schema);
  const bodies: Record<string, string> = {};
  for (const p of pages) {
    bodies[p.slug] = p.sections.map((s) => renderHtmlSection(s)).join("\n");
  }

  zip.file("data/site.json", `${JSON.stringify(schema, null, 2)}\n`);
  zip.file(
    "lib/page-bodies.ts",
    `export const PAGE_BODIES = ${JSON.stringify(bodies)} as Record<string, string>;\n`,
  );

  zip.file(
    "lib/nav-items.ts",
    `export type NavItem = { label: string; href: string };
export const NAV_ITEMS: NavItem[] = ${JSON.stringify(
      (schema.navigation?.items?.length ? schema.navigation.items : pages.map((p) => ({ label: p.title, href: `/${p.slug}` }))).map(
        (i) => ({ label: i.label, href: i.href.startsWith("/") ? i.href : `/${i.href.replace(/^#/, "")}` }),
      ),
    )};
`,
  );

  zip.file("app/globals.css", `${buildExportStylesheet(schema)}\n`);

  zip.file(
    "app/layout.tsx",
    `import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NAV_ITEMS } from "../lib/nav-items";
import site from "../data/site.json";

export const metadata: Metadata = {
  title: (site as { seo?: { title?: string } }).seo?.title ?? "Site",
  description: (site as { seo?: { description?: string } }).seo?.description ?? "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={(site as { language?: string }).language ?? "en"}>
      <body style={{ margin: 0 }}>
        <header style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 20px" }}>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 960, margin: "0 auto" }}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.href + item.label} href={item.href} style={{ fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
`,
  );

  zip.file(
    "app/[slug]/page.tsx",
    `import type { Metadata } from "next";
import { PAGE_BODIES } from "../../lib/page-bodies";
import site from "../../data/site.json";

type SiteJson = { pages: { slug: string; seo?: { title: string; description: string }; title: string }[] };

export function generateStaticParams() {
  const pages = (site as SiteJson).pages;
  return pages.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const pages = (site as SiteJson).pages;
  const page = pages.find((p) => p.slug === params.slug);
  const base = (site as { seo?: { title?: string; description?: string } }).seo;
  return {
    title: page?.seo?.title ?? page?.title ?? base?.title ?? "Page",
    description: page?.seo?.description ?? base?.description ?? "",
  };
}

export default function MarketingPage({ params }: { params: { slug: string } }) {
  const html = PAGE_BODIES[params.slug] ?? "";
  return <main className="site-export-main" dangerouslySetInnerHTML={{ __html: html }} />;
}
`,
  );

  zip.file(
    "app/page.tsx",
    `import { redirect } from "next/navigation";
import site from "../data/site.json";

export default function Index() {
  const first = (site as { pages?: { slug?: string }[] }).pages?.[0]?.slug ?? "home";
  redirect("/" + first);
}
`,
  );

  zip.file(
    "next.config.mjs",
    `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
};
export default nextConfig;
`,
  );

  zip.file(
    "tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          incremental: true,
          module: "esnext",
          esModuleInterop: true,
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          plugins: [{ name: "next" }],
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.json"],
        exclude: ["node_modules"],
      },
      null,
      2,
    )}\n`,
  );

  zip.file(
    "next-env.d.ts",
    `/// <reference types="next" />
/// <reference types="next/image-types/global" />
// NOTE: This file should not be edited
`,
  );

  zip.file(
    "package.json",
    `${JSON.stringify(
      {
        name: "exported-ai-site",
        version: "1.0.0",
        private: true,
        scripts: {
          dev: "next dev -p 3010",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "14.2.35",
          react: "18.3.1",
          "react-dom": "18.3.1",
        },
        devDependencies: {
          typescript: "5.7.3",
          "@types/node": "^20.17.16",
          "@types/react": "^18.3.18",
          "@types/react-dom": "^18.3.5",
        },
      },
      null,
      2,
    )}\n`,
  );

  zip.file(
    "README.md",
    `# Exported Next.js site

\`\`\`bash
npm install
npm run build
\`npx serve@14 out -l 4173\`  # static export output in /out
\`\`\`

Edit \`data/site.json\` or re-export from AI Website Builder.
`,
  );

  zip.file(
    ".env.example",
    `# No secrets required for static marketing export.
# NEXT_PUBLIC_ANALYTICS_ID=
`,
  );

  zip.file(".gitignore", "node_modules\n.next\nout\n.env\n");
}
