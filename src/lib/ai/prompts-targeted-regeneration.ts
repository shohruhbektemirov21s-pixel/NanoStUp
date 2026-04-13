import type { AppLocale } from "@/i18n/routing";

import type { ChatMessage } from "./chat-handler";
import type { FeedbackIntent } from "./feedback-intent";
import { getWebsiteSchemaSpecForPlanTier, type SchemaPlanTier } from "./prompts-schema-spec";

const PATCH_RULES = `
You receive the full current WebsiteSchema JSON plus structured FEEDBACK_INTENT_JSON describing what to change.
Return ONLY a JSON object of the form: { "patch": { ... } } (no markdown, no commentary).

The "patch" object uses this merge model (server applies it to the current site):
- Top-level optional keys: theme, siteName, language, seo { title?, description? }, navigation, pages[], sections[], removePageSlugs[], removeSectionIds[].
- removePageSlugs: slugs of pages to delete (e.g. "testimonials").
- removeSectionIds: section ids to delete from every page (and v1 root sections).
- pages[]: each entry MUST include "slug". Optional: id, title, seo, sections[], replaceSections (boolean).
  - For an EXISTING slug: merge title/seo; merge sections by matching "id". New ids are appended.
  - If replaceSections is true, "sections" replaces the entire page sections array (still respect global uniqueness of section ids across the site).
  - For a NEW slug: provide a full valid page (id, slug, title, sections min 1) matching WebsiteSchema rules.
- sections[] (root): only for schemaVersion "1" — same upsert-by-id behavior.
- Keep all customer-visible strings in the requested output language unless the user explicitly asks otherwise.
- Prefer minimal patches: only include keys you actually change plus any required remove* / new page payloads.
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
    `Unless the user explicitly changes site language, keep the JSON "language" field aligned with "${locale}".`,
  ].join("\n");
}

export function buildTargetedWebsiteRegenerationMessages(input: {
  schemaJson: string;
  feedback: string;
  intent: FeedbackIntent;
  contentLocale?: AppLocale;
  repairHint?: string;
  planTier?: SchemaPlanTier;
}): ChatMessage[] {
  const contentLocale = input.contentLocale ?? "uz";
  const tier = input.planTier ?? "premium";
  const schemaSpec = getWebsiteSchemaSpecForPlanTier(tier);

  const system = [
    "You are a senior frontend engineer updating a generated static marketing-site JSON using a PATCH envelope.",
    buildTargetCopyRule(contentLocale),
    schemaSpec,
    PATCH_RULES,
    "You are in JSON object response mode — the output MUST be valid JSON only.",
  ].join("\n\n");

  const userParts = [
    "FEEDBACK_INTENT_JSON:",
    JSON.stringify(input.intent),
    "",
    "USER_FEEDBACK (verbatim):",
    input.feedback.trim(),
    "",
    "Current WebsiteSchema JSON:",
    input.schemaJson.slice(0, 100_000),
  ];
  if (input.repairHint) {
    userParts.push("", "Previous answer was invalid. Fix and return ONLY valid JSON:", input.repairHint);
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n") },
  ];
}
