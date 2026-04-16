import type { AppLocale } from "@/i18n/routing";

import type { ChatMessage } from "./chat-handler";
import { getWebsiteSchemaSpecForPlanTier, type SchemaPlanTier } from "./prompts-schema-spec";
import type { WebsiteSchemaPromptSource, WebsiteTemplateKind } from "./website-generation.types";

const DIALECT_UZ = `
Sen o'zbek tili grammatikasi va shevalarni mukkammal tushunadigan mutaxassisans. 
Foydalanuvchi 'dukon', 'kafe', 'oshhona' kabi xato yoki shevada yozgan so'zlarini avtomatik ravishda 'do'kon', 'qahvaxona', 'oshxona' deb tahlil qil va shunga mos professional kontent yarat.
Agar matn transkripsiya (Whisper) natijasi bo‘lsa, imloviy xato yoki bo‘linmagan gaplarni biznes mazmuni bo‘yicha mantiqan to‘g‘rilang.
MUHIM QOIDA: Agar foydalanuvchi juda qisqa yoki xato yozsa, undan qo'shimcha ma'lumot yoki aniqlashtirish so'rama! Uning o'rnida eng mantiqiy taxminiy variantni o'zing tuzish orqali to'liq sayt yaratib ber.
`.trim();

const DIALECT_RU_VOICE = `
Речь может быть разговорной; допускаются разговорные формулировки и лёгкая «телеграм»-стилистика.
Если текст пришёл из распознавания речи (Whisper), исправляй явные разрывы фраз и опечатки по смыслу бизнеса, не меняя намерение пользователя.
`.trim();

const DIALECT_EN_VOICE = `
Speech may be informal. If the text comes from speech recognition (Whisper), fix obvious typos and broken phrases using business context—do not change the user’s intent.
`.trim();

const LOCALE_OUTPUT_NAMES: Record<AppLocale, string> = {
  uz: "Uzbek",
  ru: "Russian",
  en: "English",
};

function buildDialectGuidance(locale: AppLocale, promptSource: WebsiteSchemaPromptSource | undefined): string {
  if (locale === "uz") {
    return DIALECT_UZ;
  }
  if (promptSource !== "voice_transcript") {
    return "";
  }
  if (locale === "ru") {
    return DIALECT_RU_VOICE;
  }
  return DIALECT_EN_VOICE;
}

function buildTemplateCreativeBrief(kind: WebsiteTemplateKind | undefined): string {
  const k = kind ?? "balanced";
  if (k === "corporate") {
    return [
      "VISUAL/TONE BRIEF: corporate / B2B — restrained palette, trust-led copy, clear service hierarchy, minimal hype.",
      "Prefer professional CTAs (Contact, Request quote) and concrete proof points over playful language.",
    ].join("\n");
  }
  if (k === "portfolio") {
    return [
      "VISUAL/TONE BRIEF: portfolio / creative — emphasize showcase sections, case-study style feature blocks, strong visuals placeholders.",
      "Include a Gallery-oriented page when the plan tier allows multiple pages.",
    ].join("\n");
  }
  if (k === "landing") {
    return [
      "VISUAL/TONE BRIEF: single-story landing — one primary conversion path, short sections, repeated CTA, scannable headings.",
      "Keep page count within the plan tier; prioritize clarity over breadth.",
    ].join("\n");
  }
  return "VISUAL/TONE BRIEF: balanced marketing site — friendly, readable, conversion-aware without being gimmicky.";
}

function buildTargetCopyRule(locale: AppLocale): string {
  const languageName = LOCALE_OUTPUT_NAMES[locale];
  return [
    `TARGET OUTPUT LANGUAGE: ${languageName} (locale code "${locale}").`,
    `The JSON field "language" MUST be exactly "${locale}".`,
    `All customer-visible strings in the JSON (siteName, seo.title, seo.description, hero/features/cta/footer/contact texts, every CTA label, taglines, etc.) MUST be written entirely in ${languageName}.`,
    "Do not mix unrelated languages in marketing copy unless the user explicitly asks for bilingual content.",
    "JSON keys stay in English as in the schema; only values are natural language.",
  ].join("\n");
}

export type { WebsiteSchemaPromptSource };

export function buildWebsiteSchemaMessages(input: {
  userPrompt: string;
  repairHint?: string;
  promptSource?: WebsiteSchemaPromptSource;
  /** UI / foydalanuvchi tili — sayt matnlari shu tilda yoziladi */
  contentLocale?: AppLocale;
  /** Oldingi chat qatorlari (kontekst boyitish). */
  conversationContext?: string;
  /** Basic: 4 sahifa; Pro/Premium: 5 sahifa (Gallery). */
  planTier?: SchemaPlanTier;
  templateKind?: WebsiteTemplateKind;
}): ChatMessage[] {
  const contentLocale = input.contentLocale ?? "uz";
  const dialectBlock = buildDialectGuidance(contentLocale, input.promptSource);
  const targetRule = buildTargetCopyRule(contentLocale);
  const templateBrief = buildTemplateCreativeBrief(input.templateKind);
  const tier: SchemaPlanTier = input.planTier ?? "basic";
  const schemaSpec = getWebsiteSchemaSpecForPlanTier(tier);

const ADVANCED_SYSTEM_PROMPT = `
You are an advanced AI website generation engine with 10+ years of senior full-stack experience.

Your task is to generate a complete, production-ready, multi-page website based on a simple user prompt.

CRITICAL BEHAVIOR:
- Fully understand user intent, even if the prompt is short or informal.
- Infer missing details automatically (business type, audience, features).
- NEVER generate 18+ or inappropriate content.
- Always create safe, professional, and real-world usable websites.

DESIGN INTELLIGENCE:
Each generation MUST be visually different.
Randomly choose and apply a unique design system:
- minimal editorial
- luxury dark
- vibrant startup gradient
- glassmorphism modern
- brutalist grid
- corporate clean

You MUST vary: hero section layout, navbar style, section order, typography style, spacing and density, color palette, CTA placement, card and grid design.
DO NOT repeat the same layout structure.

SMART LOGIC:
Based on the user prompt:
- detect business type (restaurant, services, blog, portfolio, ecommerce, etc.)
- automatically add relevant sections:
  - restaurant -> menu, reservation
  - services -> booking, pricing
  - blog -> posts, categories
  - ecommerce -> products, cart UI
- generate realistic content (not placeholder nonsense)

OUTPUT REQUIREMENTS:
Return ONLY valid JSON.
Structure must include:
- siteName
- businessType
- pages (minimum 3 pages: home, about, contact)
- sections inside each page
- designDNA (visualStyle, heroVariant, navbarVariant, typography, colors, spacing)

SEO:
- auto-generate meta title and description
- include keywords

FAIL-SAFE:
If the user prompt is unclear intelligently expand it into a realistic business concept but still generate a complete website.

STRICT RULES:
- Do NOT regenerate same design patterns
- Do NOT return explanations
- Do NOT break JSON format
- Do NOT include 18+ content
- Always be production-level quality
`.trim();

  const system = [
    ADVANCED_SYSTEM_PROMPT,
    targetRule,
    templateBrief,
    dialectBlock,
    schemaSpec,
    "You are in JSON object response mode — the output MUST be valid JSON only.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userParts: string[] = [];
  if (input.promptSource === "voice_transcript") {
    userParts.push(
      "Source: user voice message (Whisper transcript). The transcript may have line breaks or spelling issues — build WebsiteSchema while preserving dialect and business meaning.",
    );
  }
  if (input.conversationContext?.trim()) {
    userParts.push(
      "Additional clarifications from the user (chat). Fold these facts into the final WebsiteSchema:\n",
      input.conversationContext.trim(),
    );
  }
  userParts.push(`User description:\n${input.userPrompt.trim()}`);
  if (input.repairHint) {
    userParts.push(`Previous answer was invalid. Fix and return ONLY valid JSON:\n${input.repairHint}`);
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n\n") },
  ];
}
