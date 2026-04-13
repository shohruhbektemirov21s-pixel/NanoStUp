import { describe, expect, it } from "vitest";

import { inferWebsiteEditScope, parseFeedbackIntent } from "../feedback-intent";

describe("parseFeedbackIntent", () => {
  it("detects theme from colors + modern wording", () => {
    expect(parseFeedbackIntent("make colors more modern").primaryScope).toBe("theme");
  });

  it("detects section + page for about page hero", () => {
    const i = parseFeedbackIntent("rewrite the about page hero");
    expect(i.primaryScope).toBe("section");
    expect(i.pageSlug).toBe("about");
    expect(i.sectionTypeHint).toBe("hero");
  });

  it("detects section id", () => {
    const i = parseFeedbackIntent("fix section:sec-home-hero typo");
    expect(i.primaryScope).toBe("section");
    expect(i.sectionId).toBe("sec-home-hero");
  });

  it("detects remove testimonials page", () => {
    const i = parseFeedbackIntent("remove testimonials page");
    expect(i.primaryScope).toBe("remove_page");
    expect(i.removePageSlugs).toContain("testimonials");
  });

  it("detects add pricing page", () => {
    const i = parseFeedbackIntent("add pricing page");
    expect(i.primaryScope).toBe("add_page");
    expect(i.addPageKind).toBe("pricing");
  });

  it("detects SEO intent", () => {
    const i = parseFeedbackIntent("better SEO for the whole site");
    expect(i.primaryScope).toBe("seo");
  });
});

describe("inferWebsiteEditScope", () => {
  it("maps tone to full for backward compatibility", () => {
    const s = inferWebsiteEditScope("change tone to modern and punchy");
    expect(s.kind).toBe("full");
  });
});
