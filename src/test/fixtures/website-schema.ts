import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";

/**
 * Turli sheva va maxsus belgilar bilan test uchun namuna sxema.
 */
export const sampleWebsiteSchema: WebsiteSchema = {
  schemaVersion: "1",
  language: "uz-Latn",
  siteName: "Cho'pon ota nonxona",
  seo: {
    title: "Non — sheva test",
    description: "Bizda somsa, tandir, \"assalomu alaykum\" deb kelganni kutamiz.",
  },
  theme: {
    primary: "#111111",
    secondary: "#222222",
    accent: "#333333",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    mutedText: "#64748b",
  },
  sections: [
    {
      type: "hero",
      id: "hero",
      title: "Xush kelibsiz, aka-yaka — issiq non!",
      subtitle: "Qirqqiz shevasi: \"nima gap?\" — baribir mazali.",
      badge: "Qo‘llab-yozuv testlari ё қ ʻ",
      primaryCta: { label: "Menyu", href: "/#menu" },
    },
    {
      type: "features",
      id: "features",
      heading: "Nimalar bor",
      items: [
        {
          title: "Tandir",
          description: "<script>alert(1)</script> yo‘q — xavfsiz chiqishi kerak.",
          icon: "none",
        },
      ],
    },
    {
      type: "cta",
      id: "cta",
      title: "Buyurtma",
      button: { label: "Telefon", href: "tel:+998901112233" },
    },
    {
      type: "contact",
      id: "contact",
      heading: "Aloqa",
      email: "info@example.com",
    },
    {
      type: "footer",
      id: "footer",
      tagline: "Rahmat, kelguningiz bilan",
      copyright: "© 2026",
    },
  ],
};
