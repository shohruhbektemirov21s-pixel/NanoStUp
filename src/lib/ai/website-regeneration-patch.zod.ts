import { z } from "zod";

import { sectionSchema, siteNavigationSchema, websiteThemeSchema } from "./website-schema.zod";

const pageSeoPartialSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(500).optional(),
});

/**
 * Sahifaga qisman o‘zgartirish: `sections` bo‘lsa id bo‘yicha upsert yoki `replaceSections`.
 */
export const sitePageMergePatchSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/i, "slug faqat harf, raqam va tire"),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/i)
    .optional(),
  title: z.string().min(1).max(120).optional(),
  seo: pageSeoPartialSchema.optional(),
  sections: z.array(sectionSchema).optional(),
  /** true bo‘lsa, mavjud sahifa sectionlari to‘liq almashtiriladi */
  replaceSections: z.boolean().optional(),
});

export const websiteRegenerationPatchSchema = z.object({
  theme: websiteThemeSchema.optional(),
  siteName: z.string().min(1).optional(),
  language: z.string().min(2).max(32).optional(),
  seo: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
    })
    .optional(),
  navigation: siteNavigationSchema.optional(),
  pages: z.array(sitePageMergePatchSchema).max(32).optional(),
  /** schemaVersion 1 uchun */
  sections: z.array(sectionSchema).max(64).optional(),
  removePageSlugs: z.array(z.string().min(1).max(48)).max(16).optional(),
  removeSectionIds: z.array(z.string().min(1).max(80)).max(80).optional(),
});

export const regenerationLlmEnvelopeSchema = z.object({
  patch: websiteRegenerationPatchSchema,
});

export type WebsiteRegenerationPatch = z.infer<typeof websiteRegenerationPatchSchema>;
export type SitePageMergePatch = z.infer<typeof sitePageMergePatchSchema>;
