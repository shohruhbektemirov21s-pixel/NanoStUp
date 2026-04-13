import { describe, expect, it } from "vitest";

import { parseModelJsonWithRecovery, removeTrailingCommasInJsonText } from "../json-recovery";

describe("removeTrailingCommasInJsonText", () => {
  it("removes trailing comma before closing brace", () => {
    expect(removeTrailingCommasInJsonText('{"a":1,}')).toBe('{"a":1}');
  });
});

describe("parseModelJsonWithRecovery", () => {
  it("parses valid JSON", () => {
    const r = parseModelJsonWithRecovery('{"hello":1}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ hello: 1 });
    }
  });

  it("repairs unquoted keys via jsonrepair", () => {
    const raw = "{ name: \"x\", \"n\": 1 }";
    const r = parseModelJsonWithRecovery(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recoveries).toContain("jsonrepair");
      expect((r.value as { name?: string }).name).toBe("x");
    }
  });
});
