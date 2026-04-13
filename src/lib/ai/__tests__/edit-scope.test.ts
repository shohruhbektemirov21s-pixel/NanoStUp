import { describe, expect, it } from "vitest";

import { inferWebsiteEditScope } from "../edit-scope";

describe("inferWebsiteEditScope (re-export)", () => {
  it("detects theme intent", () => {
    expect(inferWebsiteEditScope("make colors more modern").kind).toBe("theme");
  });

  it("detects section scope with page slug hint", () => {
    const s = inferWebsiteEditScope("rewrite the about page hero");
    expect(s.kind).toBe("section");
    expect(s.pageSlug).toBe("about");
    expect(s.sectionId).toBe("hint:hero");
  });

  it("detects section id", () => {
    const s = inferWebsiteEditScope("fix section:sec-home-hero typo");
    expect(s.kind).toBe("section");
    expect(s.sectionId).toBe("sec-home-hero");
  });
});
