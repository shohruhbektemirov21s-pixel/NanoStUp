import { describe, expect, it } from "vitest";

import { applyRegenerationPatch } from "../apply-regeneration-patch";
import type { WebsiteRegenerationPatch } from "../website-regeneration-patch.zod";
import { websiteSchema } from "../website-schema.zod";

const baseV3 = websiteSchema.parse({
  schemaVersion: "3",
  language: "en",
  siteName: "Acme",
  seo: { title: "Acme", description: "Acme Co" },
  theme: {
    primary: "#111111",
    secondary: "#222222",
    accent: "#333333",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    mutedText: "#64748b",
  },
  sections: [],
  pages: [
    {
      id: "page-home",
      slug: "home",
      title: "Home",
      sections: [
        {
          type: "hero",
          id: "sec-home-hero",
          title: "Welcome",
          subtitle: "Old",
        },
        {
          type: "features",
          id: "sec-home-features",
          heading: "Services",
          items: [{ title: "A", description: "B", icon: "none" }],
        },
      ],
    },
    {
      id: "page-about",
      slug: "about",
      title: "About",
      sections: [
        {
          type: "hero",
          id: "sec-about-hero",
          title: "About us",
        },
      ],
    },
    {
      id: "page-contact",
      slug: "contact",
      title: "Contact",
      sections: [
        {
          type: "contact",
          id: "sec-contact-main",
          heading: "Reach us",
          email: "hello@example.com",
        },
      ],
    },
  ],
});

describe("applyRegenerationPatch", () => {
  it("upserts section by id on a page", () => {
    const patch: WebsiteRegenerationPatch = {
      pages: [
        {
          slug: "home",
          sections: [
            {
              type: "hero",
              id: "sec-home-hero",
              title: "New hero",
              subtitle: "Fresh",
            },
          ],
        },
      ],
    };
    const merged = applyRegenerationPatch(baseV3, patch);
    const home = merged.pages?.find((p) => p.slug === "home");
    expect(home?.sections.find((s) => s.id === "sec-home-hero")?.type).toBe("hero");
    if (home?.sections[0]?.type === "hero") {
      expect(home.sections[0].title).toBe("New hero");
    }
    const ok = websiteSchema.safeParse(merged);
    expect(ok.success).toBe(true);
  });

  it("removes pages and sections", () => {
    const patch: WebsiteRegenerationPatch = {
      removePageSlugs: ["about"],
      removeSectionIds: ["sec-home-features"],
    };
    const merged = applyRegenerationPatch(baseV3, patch);
    expect(merged.pages?.some((p) => p.slug === "about")).toBe(false);
    const home = merged.pages?.find((p) => p.slug === "home");
    expect(home?.sections.some((s) => s.id === "sec-home-features")).toBe(false);
    const ok = websiteSchema.safeParse(merged);
    expect(ok.success).toBe(true);
  });

  it("appends a new page when slug is unknown", () => {
    const patch: WebsiteRegenerationPatch = {
      pages: [
        {
          slug: "pricing",
          id: "page-pricing",
          title: "Pricing",
          sections: [
            {
              type: "pricing",
              id: "sec-pricing-main",
              heading: "Plans",
              tiers: [
                {
                  name: "Starter",
                  price: "$9",
                  description: "Basic",
                  features: ["A", "B"],
                },
                {
                  name: "Pro",
                  price: "$29",
                  description: "More",
                  features: ["A", "B", "C"],
                },
              ],
            },
          ],
        },
      ],
    };
    const merged = applyRegenerationPatch(baseV3, patch);
    expect(merged.pages?.some((p) => p.slug === "pricing")).toBe(true);
    const ok = websiteSchema.safeParse(merged);
    expect(ok.success).toBe(true);
  });
});
