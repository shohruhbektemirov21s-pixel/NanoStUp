import { describe, expect, it } from "vitest";

import { escapeAttr, escapeHtml } from "../escape-html";

describe("escapeHtml", () => {
  it("sheva va maxsus belgilarni buzmasdan xavfsizlashtiradi", () => {
    const input = "O\u2018zbekiston — \"zor\" & <tag> й қ ʻ 🇺🇿";
    expect(escapeHtml(input)).toBe("O\u2018zbekiston — &quot;zor&quot; &amp; &lt;tag&gt; й қ ʻ 🇺🇿");
  });

  it("HTML ineksiyasini neutralizatsiya qiladi", () => {
    const input = `<img src=x onerror="alert(1)">`;
    expect(escapeHtml(input)).not.toContain("<img");
    expect(escapeHtml(input)).toContain("&lt;img");
  });
});

describe("escapeAttr", () => {
  it("atribut qiymatlarida xavfsiz", () => {
    expect(escapeAttr(`" onclick="evil()`)).toContain("&quot;");
  });
});
