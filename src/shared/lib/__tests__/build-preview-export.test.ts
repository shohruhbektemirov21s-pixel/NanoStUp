import { describe, expect, it } from "vitest";

import { sampleWebsiteSchema } from "@/test/fixtures/website-schema";

import {
  buildExportIndexHtml,
  buildExportStylesheet,
  buildSchemaMainInnerHtml,
  buildThemeCssVars,
} from "../build-preview-srcdoc";

describe("buildThemeCssVars", () => {
  it("sxema ranglarini CSS o‘zgaruvchilariga yozadi", () => {
    const css = buildThemeCssVars(sampleWebsiteSchema);
    expect(css).toContain("#111111");
    expect(css).toContain(":root{");
  });
});

describe("buildSchemaMainInnerHtml", () => {
  it("sheva matnlarini HTML ichida saqlaydi va teglarni escape qiladi", () => {
    const html = buildSchemaMainInnerHtml(sampleWebsiteSchema);
    expect(html).toContain("Cho&#039;pon ota nonxona");
    expect(html).toContain("Xush kelibsiz");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });
});

describe("buildExportIndexHtml", () => {
  it("tashqi styles.css havolasini qo‘shadi", () => {
    const doc = buildExportIndexHtml(sampleWebsiteSchema);
    expect(doc).toContain('<link rel="stylesheet" href="./styles.css"/>');
    expect(doc).toContain("<!DOCTYPE html>");
    expect(doc).toContain('lang="uz-Latn"');
    expect(doc).toContain("https://t.me/shohruhbek_2102");
    expect(doc).toContain("tel:+998501093514");
    expect(doc).toContain("platform-dev-strip");
    expect(doc).toContain("platform-dev-card");
  });
});

describe("buildExportStylesheet", () => {
  it("asosiy layout stillarini o‘z ichiga oladi", () => {
    const sheet = buildExportStylesheet(sampleWebsiteSchema);
    expect(sheet).toContain(".hero h1");
    expect(sheet).toContain("#111111");
    expect(sheet).toContain("platform-dev-card");
  });
});
