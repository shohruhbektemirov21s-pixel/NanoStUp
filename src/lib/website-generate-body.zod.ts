import { z } from "zod";

/** Web va API uchun yagona maksimal prompt uzunligi (token va server xotirasi). */
export const WEBSITE_PROMPT_MAX_CHARS = 12_000;

const localeEnum = z.enum(["uz", "ru", "en"]);

export const websiteTemplateKindSchema = z.enum(["balanced", "corporate", "portfolio", "landing"]);

/** Eski klientlar `default` yuborishi mumkin — API ichida `balanced` ga normalizatsiya. */
const templateKindIncomingSchema = z
  .union([websiteTemplateKindSchema, z.literal("default")])
  .optional()
  .transform((v) => (v === "default" ? "balanced" : v));

const contextTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(8000),
});

const MAX_CONTEXT_TURNS = 32;
const MAX_CONTEXT_CHARS = 24_000;

/**
 * POST /api/website/generate — qat'iy body tekshiruvi.
 * Ortiqcha maydonlar olib tashlanadi (strip).
 */
export const websiteGenerateBodySchema = z
  .object({
    prompt: z.string().max(WEBSITE_PROMPT_MAX_CHARS),
    locale: localeEnum.optional(),
    contextTurns: z.array(contextTurnSchema).max(MAX_CONTEXT_TURNS).optional(),
    templateKind: templateKindIncomingSchema,
  })
  .strip()
  .transform((v) => ({
    prompt: v.prompt.trim(),
    locale: v.locale,
    contextTurns: v.contextTurns,
    templateKind: v.templateKind,
  }))
  .superRefine((v, ctx) => {
    if (v.prompt.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "empty_prompt", path: ["prompt"] });
    }
    if (!v.contextTurns?.length) {
      return;
    }
    let sum = 0;
    for (const row of v.contextTurns) {
      sum += row.text.length;
    }
    if (sum > MAX_CONTEXT_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "context_too_large",
        path: ["contextTurns"],
      });
    }
  });

export type WebsiteGenerateBody = z.infer<typeof websiteGenerateBodySchema>;
