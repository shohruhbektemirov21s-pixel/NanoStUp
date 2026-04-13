import { describe, expect, it } from "vitest";

import { WEBSITE_PROMPT_MAX_CHARS, websiteGenerateBodySchema } from "../website-generate-body.zod";

describe("websiteGenerateBodySchema", () => {
  it("accepts trimmed prompt and locale", () => {
    const r = websiteGenerateBodySchema.safeParse({ prompt: "  hello  ", locale: "en" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.prompt).toBe("hello");
      expect(r.data.locale).toBe("en");
    }
  });

  it("rejects empty prompt after trim", () => {
    const r = websiteGenerateBodySchema.safeParse({ prompt: "   \n\t  " });
    expect(r.success).toBe(false);
  });

  it("rejects prompt longer than max", () => {
    const r = websiteGenerateBodySchema.safeParse({ prompt: "x".repeat(WEBSITE_PROMPT_MAX_CHARS + 1) });
    expect(r.success).toBe(false);
  });

  it("strips unknown keys", () => {
    const r = websiteGenerateBodySchema.safeParse({
      prompt: "ok",
      extra: 1,
    } as { prompt: string; extra?: number });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("extra" in r.data).toBe(false);
    }
  });

  it("accepts optional context turns", () => {
    const r = websiteGenerateBodySchema.safeParse({
      prompt: "Build my site",
      locale: "en",
      contextTurns: [
        { role: "assistant", text: "Tell me more." },
        { role: "user", text: "We run a bakery in Samarkand." },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.contextTurns?.length).toBe(2);
    }
  });

  it("rejects context payload over char budget", () => {
    const r = websiteGenerateBodySchema.safeParse({
      prompt: "ok",
      contextTurns: [{ role: "user", text: "x".repeat(25_000) }],
    });
    expect(r.success).toBe(false);
  });

  it("normalizes legacy templateKind default to balanced", () => {
    const r = websiteGenerateBodySchema.safeParse({ prompt: "ok", templateKind: "default" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.templateKind).toBe("balanced");
    }
  });

  it("accepts balanced templateKind", () => {
    const r = websiteGenerateBodySchema.safeParse({ prompt: "ok", templateKind: "balanced" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.templateKind).toBe("balanced");
    }
  });
});
