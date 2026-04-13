import type { ChatMessage } from "./chat-handler";
import type { WebsiteSchema } from "./website-schema.zod";

/**
 * Mavjud sxema tuzilmasi va matnlari o‘zgarmagan holda faqat `theme` palitrasini yangilash.
 */
export function buildWebsiteThemeRefreshMessages(schema: WebsiteSchema): ChatMessage[] {
  const system = [
    "You are a senior brand designer.",
    "Return ONLY one JSON object — the full WebsiteSchema, identical structure to the input:",
    "- Same schemaVersion, language, siteName, seo, pages (same slugs, titles, section ids, all copy and CTAs).",
    "- ONLY replace `theme` with a NEW cohesive premium palette (7 hex colors).",
    "Colors must be #RRGGBB or #RGB, strong contrast (text readable on background).",
    "No markdown, no commentary — JSON only.",
  ].join("\n");

  const user = `Current WebsiteSchema JSON:\n${JSON.stringify(schema)}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
