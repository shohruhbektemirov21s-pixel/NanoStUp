import { z } from "zod";

import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";

const localeEnum = z.enum(["uz", "ru", "en"]);

export const websiteFixBodySchema = z
  .object({
    schema: z.unknown(),
    issue: z.string().max(WEBSITE_PROMPT_MAX_CHARS),
    locale: localeEnum.optional(),
  })
  .strip()
  .transform((v) => ({
    schema: v.schema,
    issue: v.issue.trim(),
    locale: v.locale,
  }))
  .superRefine((v, ctx) => {
    if (v.issue.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "empty_issue", path: ["issue"] });
    }
  });

export type WebsiteFixBody = z.infer<typeof websiteFixBodySchema>;
