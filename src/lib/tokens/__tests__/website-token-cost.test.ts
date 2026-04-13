import { describe, expect, it } from "vitest";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import {
  computeWebsiteGenerationTokenCost,
  MULTI_PAGE_TOKEN_COST,
  SINGLE_PAGE_TOKEN_COST,
} from "@/lib/tokens/website-token-cost";
import { sampleWebsiteSchema } from "@/test/fixtures/website-schema";

describe("computeWebsiteGenerationTokenCost", () => {
  it("charges 10 for single-page (v1) schema", () => {
    expect(computeWebsiteGenerationTokenCost(sampleWebsiteSchema)).toBe(SINGLE_PAGE_TOKEN_COST);
  });

  it("charges 50 for multi-page v2 schema", () => {
    const multi: WebsiteSchema = {
      schemaVersion: "2",
      language: "uz",
      siteName: "Demo",
      seo: { title: "T", description: "D" },
      theme: sampleWebsiteSchema.theme,
      sections: [],
      pages: [
        {
          id: "a",
          slug: "home",
          title: "Home",
          sections: [{ type: "hero", id: "h", title: "Hi" }],
        },
        {
          id: "b",
          slug: "contact",
          title: "Contact",
          sections: [{ type: "contact", id: "c", heading: "C", email: "a@b.co" }],
        },
      ],
    };
    expect(computeWebsiteGenerationTokenCost(multi)).toBe(MULTI_PAGE_TOKEN_COST);
  });

  it("charges 58 for v3 with 6 pages", () => {
    const pages = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      slug: `p${i}`,
      title: `P${i}`,
      sections: [{ type: "hero" as const, id: `h${i}`, title: "T" }],
    }));
    const s: WebsiteSchema = {
      schemaVersion: "3",
      language: "en",
      siteName: "Big",
      seo: { title: "T", description: "D" },
      theme: sampleWebsiteSchema.theme,
      sections: [],
      pages,
    };
    expect(computeWebsiteGenerationTokenCost(s)).toBe(58);
  });
});
