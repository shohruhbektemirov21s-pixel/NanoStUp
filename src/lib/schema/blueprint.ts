import { z } from "zod";

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

export const blueprintSchema = z.object({
  siteName: z.string().min(1),
  businessType: z.string().min(1),
  targetAudience: z.string().min(1),
  brandTone: z.string().min(1),
  language: z.enum(["uz", "ru", "en"]),
  pages: z.array(
    z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      requiredSections: z.array(z.string()).min(1),
    })
  ).min(1),
  designDNA: designDNASchema,
  featureSuggestions: z.array(z.string()).optional(),
});

export type Blueprint = z.infer<typeof blueprintSchema>;
export type DesignDNA = z.infer<typeof designDNASchema>;
