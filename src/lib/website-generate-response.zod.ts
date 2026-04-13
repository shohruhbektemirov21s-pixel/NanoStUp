import { z } from "zod";

import { websiteSchema } from "@/lib/ai/website-schema.zod";

/**
 * POST /api/website/generate — muvaffaqiyatli javob shakli (klient va server ikkalasi uchun).
 */
export const websiteGeneratePipelineMetaSchema = z.object({
  recoveries: z.array(z.string()).max(24).optional(),
  sanitization: z
    .object({
      removedControlChars: z.number().int().min(0).max(1_000_000).optional(),
      truncated: z.boolean().optional(),
    })
    .optional(),
});

export const websiteGenerateSuccessResponseSchema = z.object({
  schema: websiteSchema,
  attemptsUsed: z.number().int().min(1).max(32),
  usedFallback: z.boolean(),
  warnings: z.array(z.string()).max(24).default([]),
  pipeline: websiteGeneratePipelineMetaSchema.optional(),
});

export type WebsiteGenerateSuccessResponse = z.infer<typeof websiteGenerateSuccessResponseSchema>;
