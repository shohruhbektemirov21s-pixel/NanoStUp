import { describe, expect, it } from "vitest";

import { parseModelJsonWithRecovery, removeTrailingCommasInJsonText } from "@/lib/ai/pipeline/json-recovery";
import { sanitizeWebsiteUserPrompt } from "@/lib/ai/pipeline/prompt-sanitize";

describe("sanitizeWebsiteUserPrompt", () => {
  it("removes NUL and control characters except tab/newline", () => {
    const { text, removedControlChars, truncated } = sanitizeWebsiteUserPrompt("a\u0000b\tc\nd", 1000);
    expect(text).toBe("ab\tc\nd");
    expect(removedControlChars).toBe(1);
    expect(truncated).toBe(false);
  });

  it("truncates to maxChars", () => {
    const long = "x".repeat(20);
    const { text, truncated } = sanitizeWebsiteUserPrompt(long, 10);
    expect(text.length).toBe(10);
    expect(truncated).toBe(true);
  });
});

describe("removeTrailingCommasInJsonText", () => {
  it("allows JSON.parse after trailing comma fix", () => {
    const bad = '{"a":1,}';
    const fixed = removeTrailingCommasInJsonText(bad);
    expect(() => JSON.parse(fixed)).not.toThrow();
    expect(JSON.parse(fixed)).toEqual({ a: 1 });
  });
});

describe("parseModelJsonWithRecovery", () => {
  it("parses fenced JSON with trailing comma", () => {
    const raw = '```json\n{"x":1,}\n```';
    const r = parseModelJsonWithRecovery(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.value as { x: number }).x).toBe(1);
      expect(r.recoveries).toContain("remove_trailing_commas");
    }
  });
});
