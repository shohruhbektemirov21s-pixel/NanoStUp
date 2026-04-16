import { WebsiteSchema } from "../schema/website";

export function generateSEO(schema: WebsiteSchema) {
  const { siteName, businessType, language } = schema;
  
  const translations: Record<string, any> = {
    uz: {
      titleTail: "Professional xizmatlar",
      descriptionPrefix: "Bizning kompaniyamiz eng yuqori sifatli xizmatlarni taqdim etadi.",
      keywords: ["professional", siteName, businessType, "o'zbekiston"]
    },
    ru: {
      titleTail: "Профессиональные услуги",
      descriptionPrefix: "Наша компания предоставляет услуги высочайшего качества.",
      keywords: ["профессиональный", siteName, businessType, "россия", "узбекистан"]
    },
    en: {
      titleTail: "Professional Services",
      descriptionPrefix: "Our company provides services of the highest quality.",
      keywords: ["professional", siteName, businessType, "worldwide"]
    }
  };

  const t = translations[language] || translations.en;

  return {
    title: `${siteName} | ${t.titleTail}`,
    description: `${t.descriptionPrefix} ${siteName} - ${businessType} sohasida yetakchi.`,
    keywords: t.keywords.join(", ")
  };
}
