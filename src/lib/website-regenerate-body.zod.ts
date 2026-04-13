import { z } from "zod";

import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";

const localeEnum = z.enum(["uz", "ru", "en"]);

export const websiteRegenerateBodySchema = z
  .object({
    schema: z.unknown(),
    feedback: z.string().max(WEBSITE_PROMPT_MAX_CHARS),
    locale: localeEnum.optional(),
  })
  .strip()
  .transform((v) => ({
    schema: v.schema,
    feedback: v.feedback.trim(),
    locale: v.locale,
  }))
  .superRefine((v, ctx) => {
    if (v.feedback.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "empty_feedback", path: ["feedback"] });
    }
  });

export type WebsiteRegenerateBody = z.infer<typeof websiteRegenerateBodySchema>;
