import type { AppLocale } from "@/i18n/routing";

import type { ChatMessage } from "./chat-handler";
import { getWebsiteSchemaSpecForPlanTier, type SchemaPlanTier } from "./prompts-schema-spec";

const FIX_RULES = `
You receive an existing WebsiteSchema JSON and a user-reported problem (bug, typo, layout intent, missing section, wrong link, etc.).
Return ONLY one corrected JSON object that still matches the same WebsiteSchema rules (no markdown, no commentary).
Preserve all parts that the user did not ask to change. Apply minimal, safe edits.
If the report is ambiguous, make the most reasonable fix and keep the site coherent.
`.trim();

const NLP_SPELLING = `
Natural-language spelling / dialect fixes (especially Uzbek): if the user asks to correct words (e.g. informal "dukon" → standard "do'kon", "oshhona" → "oshxona"), apply those corrections to ALL matching customer-visible strings in the JSON (headings, body copy, CTA labels, SEO fields) while keeping structure and ids stable unless a structural change is explicitly required.
`.trim();

const LOCALE_OUTPUT_NAMES: Record<AppLocale, string> = {
  uz: "Uzbek",
  ru: "Russian",
  en: "English",
};

function buildTargetCopyRule(locale: AppLocale): string {
  const languageName = LOCALE_OUTPUT_NAMES[locale];
  return [
    `TARGET OUTPUT LANGUAGE for customer-visible strings: ${languageName} (locale code "${locale}").`,
    `The JSON field "language" MUST remain exactly "${locale}" unless the user explicitly requests a different site language.`,
  ].join("\n");
}

export function buildWebsiteFixMessages(input: {
  schemaJson: string;
  userIssue: string;
  contentLocale?: AppLocale;
  repairHint?: string;
  /** Tuzatishda ruxsat etilgan maksimal sahifa sxemasi (odatda foydalanuvchi rejasi). */
  planTier?: SchemaPlanTier;
}): ChatMessage[] {
  const contentLocale = input.contentLocale ?? "uz";
  const tier = input.planTier ?? "premium";
  const schemaSpec = getWebsiteSchemaSpecForPlanTier(tier);

  const system = [
    "You are a senior frontend engineer fixing generated static marketing-site JSON.",
    buildTargetCopyRule(contentLocale),
    schemaSpec,
    NLP_SPELLING,
    FIX_RULES,
    "You are in JSON object response mode — the output MUST be valid JSON only.",
  ].join("\n\n");

  const userParts = [
    "Current WebsiteSchema JSON:",
    input.schemaJson.slice(0, 100_000),
    "",
    "User report / requested change:",
    input.userIssue.trim(),
  ];
  if (input.repairHint) {
    userParts.push("", "Previous answer was invalid. Fix and return ONLY valid JSON:", input.repairHint);
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n") },
  ];
}
