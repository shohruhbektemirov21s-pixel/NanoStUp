import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Rang #RGB yoki #RRGGBB formatida bo‘lishi kerak");

const hrefSchema = z.string().refine(
  (value) =>
    value.startsWith("/") ||
    /^https?:\/\//i.test(value) ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value === "#" ||
    value.startsWith("#"),
  { message: "href nisbiy yo‘l (/...), http(s), mailto:, tel:, # yoki #fragment bo‘lishi kerak" },
);

const ctaSchema = z.object({
  label: z.string().min(1),
  href: hrefSchema,
});

const baseSectionSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/i, "id faqat harf, raqam, tire va pastki chiziq"),
  /** AI layout variant — preview/eksport ixtiyoriy ishlatadi */
  variant: z.string().max(64).optional(),
});

export const heroSectionSchema = baseSectionSchema.extend({
  type: z.literal("hero"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  primaryCta: ctaSchema.optional(),
  secondaryCta: ctaSchema.optional(),
});

export const featuresSectionSchema = baseSectionSchema.extend({
  type: z.literal("features"),
  heading: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        icon: z.enum(["sparkles", "shield", "zap", "globe", "none"]).optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const ctaSectionSchema = baseSectionSchema.extend({
  type: z.literal("cta"),
  title: z.string().min(1),
  description: z.string().optional(),
  button: ctaSchema,
});

export const footerSectionSchema = baseSectionSchema.extend({
  type: z.literal("footer"),
  tagline: z.string().min(1),
  copyright: z.string().optional(),
});

export const contactSectionSchema = baseSectionSchema.extend({
  type: z.literal("contact"),
  heading: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(3).optional(),
  address: z.string().optional(),
});

export const pricingSectionSchema = baseSectionSchema.extend({
  type: z.literal("pricing"),
  heading: z.string().min(1),
  subheading: z.string().optional(),
  tiers: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.string().min(1),
        description: z.string().min(1),
        features: z.array(z.string().min(1)).min(1).max(16),
        cta: ctaSchema.optional(),
      }),
    )
    .min(2)
    .max(4),
});

export const testimonialsSectionSchema = baseSectionSchema.extend({
  type: z.literal("testimonials"),
  heading: z.string().min(1),
  items: z
    .array(
      z.object({
        quote: z.string().min(1),
        author: z.string().min(1),
        role: z.string().optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const faqSectionSchema = baseSectionSchema.extend({
  type: z.literal("faq"),
  heading: z.string().min(1),
  items: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1)
    .max(24),
});

export const blogTeaserSectionSchema = baseSectionSchema.extend({
  type: z.literal("blogTeaser"),
  heading: z.string().min(1),
  posts: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.string().min(1),
        href: hrefSchema,
      }),
    )
    .min(1)
    .max(8),
});

export const textBlockSectionSchema = baseSectionSchema.extend({
  type: z.literal("textBlock"),
  heading: z.string().optional(),
  paragraphs: z.array(z.string().min(1)).min(1).max(24),
});

export const trustStripSectionSchema = baseSectionSchema.extend({
  type: z.literal("trustStrip"),
  heading: z.string().optional(),
  bullets: z.array(z.string().min(1)).min(1).max(10),
});

export const leadFormSectionSchema = baseSectionSchema.extend({
  type: z.literal("leadForm"),
  heading: z.string().min(1),
  subheading: z.string().optional(),
  endpointPlaceholder: z.string().max(512).optional(),
  fields: z.array(z.enum(["name", "email", "phone", "message"])).min(1).max(4),
});

export const gallerySectionSchema = baseSectionSchema.extend({
  type: z.literal("gallery"),
  heading: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        imageAlt: z.string().min(1),
      }),
    )
    .min(2)
    .max(16),
});

/** Kelajakdagi tiplar uchun xavfsiz fallback — matnni chiqaradi */
export const customSectionSchema = baseSectionSchema.extend({
  type: z.literal("custom"),
  title: z.string().optional(),
  body: z.string().min(1).max(20_000),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  featuresSectionSchema,
  ctaSectionSchema,
  footerSectionSchema,
  contactSectionSchema,
  pricingSectionSchema,
  testimonialsSectionSchema,
  faqSectionSchema,
  blogTeaserSectionSchema,
  textBlockSectionSchema,
  trustStripSectionSchema,
  leadFormSectionSchema,
  gallerySectionSchema,
  customSectionSchema,
]);

export const websiteThemeSchema = z.object({
  primary: hexColorSchema,
  secondary: hexColorSchema,
  accent: hexColorSchema,
  background: hexColorSchema,
  surface: hexColorSchema,
  text: hexColorSchema,
  mutedText: hexColorSchema,
});

const pageSeoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
});

export const siteNavigationSchema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        href: hrefSchema,
      }),
    )
    .min(1)
    .max(24),
});

export const sitePageSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/i, "page id faqat harf, raqam, tire va pastki chiziq"),
  slug: z
    .string()
    .min(1)
    .max(48)
    .regex(/^[a-z0-9-]+$/i, "slug faqat harf, raqam va tire"),
  title: z.string().min(1).max(120),
  /** Sahifa darajasidagi SEO (v3 tavsiya) */
  seo: pageSeoSchema.optional(),
  sections: z.array(sectionSchema).min(1),
});

export const designDNASchema = z.object({
  visualStyle: z.enum([
    "minimal-editorial",
    "luxury-dark",
    "startup-gradient",
    "glassmorphism-soft",
    "brutalist-grid",
    "corporate-clean",
  ]),
  heroVariant: z.enum([
    "split-hero",
    "centered-hero",
    "full-overlay-hero",
    "cards-hero",
    "product-hero",
  ]),
  navbarVariant: z.enum(["floating", "classic", "centered-logo", "sidebar"]),
  typographyMood: z.enum(["clean-sans", "premium-serif", "modern-tech", "friendly-rounded"]),
  spacingMode: z.enum(["compact", "balanced", "airy"]),
  cardStyle: z.enum(["soft", "sharp", "glass", "bordered", "elevated"]),
  colorMode: z.enum([
    "neutral-light",
    "dark-premium",
    "gradient-vibrant",
    "soft-pastel",
    "monochrome-bold",
  ]),
});

export const websiteSchema = z
  .object({
    schemaVersion: z.enum(["1", "2", "3"]),
    language: z.string().min(2).max(32),
    siteName: z.string().min(1),
    businessType: z.string().min(1).max(120).optional(),
    seo: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    }),
    theme: websiteThemeSchema,
    designDNA: designDNASchema.optional(),
    /** v1: barcha bloklar shu yerda. v2/v3: bo‘sh yoki qoldiq */
    sections: z.array(sectionSchema).default([]),
    pages: z.array(sitePageSchema).optional(),
    /** Navbar havolalari — bo‘lsa, preview/eksport ustun */
    navigation: siteNavigationSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.schemaVersion === "1") {
      if (data.sections.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "schemaVersion 1 uchun kamida bitta section kerak",
          path: ["sections"],
        });
      }
      return;
    }
    if (!data.pages || data.pages.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "schemaVersion 2 yoki 3 uchun kamida 2 ta sahifa (pages) kerak",
        path: ["pages"],
      });
      return;
    }
    const slugKeys = new Set<string>();
    for (const page of data.pages) {
      const key = page.slug.trim().toLowerCase();
      if (slugKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Takroriy slug: ${page.slug}`,
          path: ["pages"],
        });
        return;
      }
      slugKeys.add(key);
    }
    const seen = new Set<string>();
    for (const page of data.pages) {
      for (const sec of page.sections) {
        if (seen.has(sec.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Takroriy section id: ${sec.id}`,
            path: ["pages"],
          });
          return;
        }
        seen.add(sec.id);
      }
    }
  });

export type WebsiteSchema = z.infer<typeof websiteSchema>;
export type WebsiteSection = z.infer<typeof sectionSchema>;
export type WebsiteTheme = z.infer<typeof websiteThemeSchema>;
export type SitePage = z.infer<typeof sitePageSchema>;
export type SiteNavigation = z.infer<typeof siteNavigationSchema>;
export type DesignDNA = z.infer<typeof designDNASchema>;
