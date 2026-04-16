import { Blueprint } from "../schema/blueprint";
import { WebsiteSchema } from "../schema/website";

export function getFallbackSchema(blueprint?: Blueprint): WebsiteSchema {
  const safeLang = blueprint?.language || "en";
  const siteName = blueprint?.siteName || "Premium Business";
  const bizType = blueprint?.businessType || "corporate";

  return {
    siteName,
    businessType: bizType,
    language: safeLang,
    seo: {
      title: `${siteName} - Professional Services`,
      description: `Welcome to ${siteName}. We provide top-tier services for our clients.`
    },
    designDNA: blueprint?.designDNA || {
      visualStyle: "corporate-clean",
      heroVariant: "centered-hero",
      navbarVariant: "classic",
      typographyMood: "clean-sans",
      spacingMode: "balanced",
      cardStyle: "bordered",
      colorMode: "neutral-light",
    },
    pages: [
      {
        slug: "",
        title: "Home",
        meta: { title: "Home", description: "Home page" },
        sections: [
          {
            id: "nav-1",
            type: "navbar",
            settings: {},
            content: {
              logo: siteName,
              links: [
                { label: "Home", href: "/" },
                { label: "Services", href: "/services" },
                { label: "Contact", href: "/contact" }
              ]
            }
          },
          {
            id: "hero-1",
            type: "hero",
            settings: {},
            content: {
              title: `Welcome to ${siteName}`,
              subtitle: "We build reliable solutions for modern businesses.",
              primaryCta: { label: "Get Started", href: "/contact" }
            }
          },
          {
            id: "features-1",
            type: "features",
            settings: {},
            content: {
              heading: "Our Features",
              items: [
                { title: "Reliability", description: "You can count on us 24/7." },
                { title: "Speed", description: "Lightning fast delivery." },
                { title: "Quality", description: "We never compromise on standards." }
              ]
            }
          },
          {
            id: "footer-1",
            type: "footer",
            settings: {},
            content: {
              text: `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`
            }
          }
        ]
      }
    ]
  };
}
