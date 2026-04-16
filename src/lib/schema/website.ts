import { z } from "zod";
import { designDNASchema } from "./blueprint";

const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.string().optional(),
});

const sectionBaseSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  variant: z.string().optional(),
  settings: z.record(z.any()).optional().default({}),
});

// We can define strict content schemas for each type for safety, but 
// a catch-all record is flexible enough for AI generation if paired with good type definitions.
// To be safe and strict, let's use a union of allowed types.
const SectionTypes = z.enum([
  "hero", "features", "services", "products", "menu", "about", "stats",
  "testimonials", "faq", "gallery", "pricing", "booking", "team",
  "blog-list", "contact", "cta", "footer", "navbar"
]);

export const sectionSchema = sectionBaseSchema.extend({
  type: SectionTypes,
  content: z.record(z.any()), // flexible content, will map correctly in components
});

export const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  meta: seoSchema.optional(),
  sections: z.array(sectionSchema).min(1),
});

export const websiteSchema = z.object({
  siteName: z.string().min(1),
  businessType: z.string().min(1),
  language: z.enum(["uz", "ru", "en"]),
  seo: seoSchema,
  designDNA: designDNASchema,
  pages: z.array(pageSchema).min(1),
});

export type SectionType = z.infer<typeof SectionTypes>;
export type WebsiteSection = z.infer<typeof sectionSchema>;
export type WebsitePage = z.infer<typeof pageSchema>;
export type WebsiteSchema = z.infer<typeof websiteSchema>;
export type SEO = z.infer<typeof seoSchema>;
