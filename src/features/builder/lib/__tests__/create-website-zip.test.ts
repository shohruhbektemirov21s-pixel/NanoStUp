import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { sampleWebsiteSchema } from "@/test/fixtures/website-schema";
import { buildWebsiteZipUint8Array } from "@/shared/lib/build-website-zip";
import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";

import { slugifyNpmPackageName } from "@/shared/lib/slugify";

import { createWebsiteZipBlob, slugifySiteFileName } from "../create-website-zip";

describe("slugifySiteFileName", () => {
  it("kirill va lotin aralashmasidan fayl nomi yasaydi", () => {
    expect(slugifySiteFileName("  Non va Kabob  ")).toMatch(/^non-va-kabob$/);
  });

  it("bo‘sh qiymatda default qaytaradi", () => {
    expect(slugifySiteFileName("   !!!   ")).toBe("website");
  });
});

describe("slugifyNpmPackageName", () => {
  it("raqam bilan boshlansa site- prefiksi qo‘shadi", () => {
    expect(slugifyNpmPackageName("123 Cafe")).toMatch(/^site-/);
  });
});

const sampleMultiPage: WebsiteSchema = {
  schemaVersion: "2",
  language: "en",
  siteName: "Demo Pages",
  seo: { title: "Demo", description: "Multi-page export fixture." },
  theme: {
    primary: "#0f766e",
    secondary: "#134e4a",
    accent: "#2dd4bf",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    mutedText: "#64748b",
  },
  sections: [],
  pages: [
    {
      id: "p1",
      slug: "home",
      title: "Home",
      sections: [{ type: "hero", id: "h1", title: "Welcome", subtitle: "Hi" }],
    },
    {
      id: "p2",
      slug: "about",
      title: "About",
      sections: [{ type: "hero", id: "h2", title: "About us", subtitle: "Story" }],
    },
  ],
};

describe("createWebsiteZipBlob", () => {
  it("starter fayllar va yagona stylesheet bog‘lanishini qo‘shadi", async () => {
    const blob = await createWebsiteZipBlob(sampleWebsiteSchema);
    expect(blob.size).toBeGreaterThan(400);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files)
      .filter((n) => !zip.files[n]?.dir)
      .sort();

    expect(names).toEqual(
      expect.arrayContaining([
        "index.html",
        "styles.css",
        "package.json",
        "README.md",
        ".env.example",
        ".gitignore",
        "docs/DEPLOYMENT.md",
        "partials/README.md",
        "partials/examples/hero.example.html",
        "assets/README.txt",
      ]),
    );

    const index = await zip.file("index.html")?.async("string");
    expect(index).toBeDefined();
    expect(index).toContain("./styles.css");
    expect(index).toContain("Cho&#039;pon ota nonxona");
    const linkCount = (index!.match(/<link rel="stylesheet"/g) ?? []).length;
    expect(linkCount).toBe(1);
    expect(index).not.toContain("./js/router.js");

    const pkg = await zip.file("package.json")?.async("string");
    expect(pkg).toContain('"private": true');
    expect(pkg).toContain('"dev":');

    const css = await zip.file("styles.css")?.async("string");
    expect(css).toContain("#111111");
  });

  it("ko‘p sahifada js/router.js chiqadi", async () => {
    const bytes = await buildWebsiteZipUint8Array(sampleMultiPage);
    const zip = await JSZip.loadAsync(bytes);
    const router = await zip.file("js/router.js")?.async("string");
    expect(router).toBeDefined();
    expect(router).toContain("defaultSlug");
    const index = await zip.file("index.html")?.async("string");
    expect(index).toContain('./js/router.js" defer');
  });

  it("next format includes app router and site json", async () => {
    const bytes = await buildWebsiteZipUint8Array(sampleMultiPage, { format: "next" });
    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("package.json")?.async("string")).toContain('"next"');
    expect(await zip.file("data/site.json")?.async("string")).toContain("Demo Pages");
    expect(await zip.file("app/[slug]/page.tsx")?.async("string")).toContain("generateStaticParams");
  });
});
