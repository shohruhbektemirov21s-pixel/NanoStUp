import { describe, expect, it } from "vitest";

import { AiEngineError } from "../errors";
import { parseModelJson } from "../json-parse";

describe("parseModelJson", () => {
  it("```json``` blokidagi sheva va unicode bilan JSONni ajratadi", () => {
    const raw = ["```json", '{"title":"Salom, dost! O\u2018zbekiston — 🇺🇿","n":1}', "```"].join("\n");
    const parsed = parseModelJson(raw) as { title: string; n: number };
    expect(parsed.n).toBe(1);
    expect(parsed.title).toContain("O");
    expect(parsed.title).toContain("zbekiston");
  });

  it("toza JSON qatorini parse qiladi", () => {
    const parsed = parseModelJson(`  {"ok":true}  `) as { ok: boolean };
    expect(parsed.ok).toBe(true);
  });

  it("noto‘g‘ri JSONda AiEngineError tashlaydi", () => {
    expect(() => parseModelJson("not json")).toThrow(AiEngineError);
  });
});
