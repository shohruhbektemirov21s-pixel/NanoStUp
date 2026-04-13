import "server-only";

import type { AppLocale } from "@/i18n/routing";

import type { SchemaPlanTier } from "../prompts-schema-spec";
import { websiteSchema, type WebsiteSchema } from "../website-schema.zod";

const DEFAULT_THEME: WebsiteSchema["theme"] = {
  primary: "#0f766e",
  secondary: "#134e4a",
  accent: "#2dd4bf",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  mutedText: "#64748b",
};

function deriveSiteName(prompt: string): string {
  const line = prompt.split(/\r?\n/).find((l) => l.trim().length > 0) ?? prompt;
  const cleaned = line.replace(/\s+/g, " ").trim().slice(0, 80);
  if (cleaned.length < 2) {
    return "My site";
  }
  return cleaned;
}

function localeToLanguage(locale: AppLocale | undefined): string {
  if (locale === "ru") {
    return "ru";
  }
  if (locale === "en") {
    return "en";
  }
  return "uz";
}

function navLabel(language: string, ru: string, en: string, uz: string): string {
  if (language === "ru") {
    return ru;
  }
  if (language === "en") {
    return en;
  }
  return uz;
}

/**
 * LLM barcha urinishlardan keyin ham sxema bermasa — Zod mos multi-page (schema v3).
 */
export function buildFallbackWebsiteSchema(input: {
  userPrompt: string;
  contentLocale?: AppLocale;
  planTier?: SchemaPlanTier;
}): WebsiteSchema {
  const siteName = deriveSiteName(input.userPrompt);
  const language = localeToLanguage(input.contentLocale);
  const tier = input.planTier ?? "basic";
  const extended = tier === "pro" || tier === "premium";

  const desc =
    language === "ru"
      ? "Страница создана в резервном режиме — отредактируйте тексты."
      : language === "en"
        ? "Generated in safe fallback mode — please edit the copy."
        : "Zaxira shablon rejimida yaratildi — matnlarni tahrirlang.";

  const home: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-home",
    slug: "home",
    title: navLabel(language, "Главная", "Home", "Bosh sahifa"),
    seo: { title: siteName, description: desc },
    sections: [
      {
        id: "sec-home-hero",
        type: "hero",
        title: siteName,
        subtitle: navLabel(
          language,
          "Краткое описание вашего бизнеса — замените текст в редакторе.",
          "A short description of your business — replace this text in the editor.",
          "Biznesingiz haqida qisqa tavsif — matnni keyinroq tahrirlang.",
        ),
        primaryCta: {
          label: navLabel(language, "Связаться", "Contact", "Aloqa"),
          href: "/contact",
        },
      },
      {
        id: "sec-home-features",
        type: "features",
        heading: navLabel(language, "Преимущества", "Highlights", "Afzalliklar"),
        items: [
          {
            title: navLabel(language, "Качество", "Quality", "Sifat"),
            description: navLabel(
              language,
              "Опишите, чем вы отличаетесь.",
              "Describe what makes you different.",
              "O‘zingizni nima bilan ajratib turishingizni yozing.",
            ),
            icon: "sparkles",
          },
          {
            title: navLabel(language, "Надёжность", "Reliability", "Ishonchlilik"),
            description: navLabel(
              language,
              "Гарантии и опыт работы.",
              "Trust signals and experience.",
              "Ishonch va tajriba.",
            ),
            icon: "shield",
          },
        ],
      },
      {
        id: "sec-home-trust",
        type: "trustStrip",
        heading: navLabel(language, "Почему нам доверяют", "Why people trust us", "Nega bizga ishonishadi"),
        bullets: [
          navLabel(language, "Прозрачные условия", "Clear terms", "Shaffof shartlar"),
          navLabel(language, "Поддержка клиентов", "Customer support", "Mijozlarga yordam"),
        ],
      },
    ],
  };

  const about: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-about",
    slug: "about",
    title: navLabel(language, "О нас", "About", "Biz haqimizda"),
    sections: [
      {
        id: "sec-about-text",
        type: "textBlock",
        heading: navLabel(language, "История", "Our story", "Bizning tarix"),
        paragraphs: [
          navLabel(
            language,
            "Расскажите историю компании, миссию и ценности — этот текст можно заменить.",
            "Tell your company story, mission, and values — replace this copy.",
            "Kompaniya tarixini, missiya va qadriyatlarni yozing — matnni almashtiring.",
          ),
        ],
      },
    ],
  };

  const services: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-services",
    slug: "services",
    title: navLabel(language, "Услуги", "Services", "Xizmatlar"),
    sections: [
      {
        id: "sec-services-features",
        type: "features",
        heading: navLabel(language, "Услуги", "What we offer", "Nimalar taklif qilamiz"),
        items: [
          {
            title: navLabel(language, "Услуга 1", "Service 1", "Xizmat 1"),
            description: navLabel(
              language,
              "Кратко опишите услугу.",
              "Briefly describe the service.",
              "Xizmatni qisqacha tasvirlang.",
            ),
            icon: "zap",
          },
        ],
      },
      {
        id: "sec-services-cta",
        type: "cta",
        title: navLabel(language, "Связаться", "Get in touch", "Bog‘lanish"),
        button: {
          label: navLabel(language, "Контакты", "Contact", "Aloqa"),
          href: "/contact",
        },
      },
    ],
  };

  const pricing: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-pricing",
    slug: "pricing",
    title: navLabel(language, "Цены", "Pricing", "Narxlar"),
    sections: [
      {
        id: "sec-pricing-main",
        type: "pricing",
        heading: navLabel(language, "Тарифы", "Plans", "Tariflar"),
        tiers: [
          {
            name: navLabel(language, "Старт", "Starter", "Boshlang‘ich"),
            price: navLabel(language, "от 99 000 сум", "from $29", "99 000 so‘mdan"),
            description: navLabel(language, "Для малого бизнеса", "For small teams", "Kichik biznes uchun"),
            features: [
              navLabel(language, "Основные страницы", "Core pages", "Asosiy sahifalar"),
              navLabel(language, "Email-поддержка", "Email support", "Email yordam"),
            ],
          },
          {
            name: navLabel(language, "Про", "Pro", "Pro"),
            price: navLabel(language, "от 199 000 сум", "from $79", "199 000 so‘mdan"),
            description: navLabel(language, "Рост и автоматизация", "Growth-ready", "O‘sish uchun"),
            features: [
              navLabel(language, "Расширенный контент", "Rich content", "Kengaytirilgan kontent"),
              navLabel(language, "Приоритетная поддержка", "Priority support", "Ustuvor yordam"),
            ],
            cta: {
              label: navLabel(language, "Связаться", "Contact us", "Aloqa"),
              href: "/contact",
            },
          },
        ],
      },
    ],
  };

  const faq: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-faq",
    slug: "faq",
    title: "FAQ",
    sections: [
      {
        id: "sec-faq-main",
        type: "faq",
        heading: navLabel(language, "Частые вопросы", "FAQ", "Savol-javob"),
        items: [
          {
            question: navLabel(language, "Как с вами связаться?", "How do I contact you?", "Qanday bog‘lanaman?"),
            answer: navLabel(
              language,
              "Используйте страницу контактов или форму на сайте.",
              "Use the contact page or the form on this site.",
              "Aloqa sahifasi yoki formadan foydalaning.",
            ),
          },
          {
            question: navLabel(language, "Где вы работаете?", "Where do you operate?", "Qayerda xizmat ko‘rsatasiz?"),
            answer: navLabel(
              language,
              "Опишите география в этом ответе.",
              "Describe your service area here.",
              "Xizmat hududingizni bu yerda yozing.",
            ),
          },
        ],
      },
    ],
  };

  const contact: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-contact",
    slug: "contact",
    title: navLabel(language, "Контакты", "Contact", "Aloqa"),
    sections: [
      {
        id: "sec-contact-lead",
        type: "leadForm",
        heading: navLabel(language, "Оставьте заявку", "Send a message", "Xabar yuboring"),
        subheading: navLabel(
          language,
          "Мы ответим в ближайшее время.",
          "We will get back to you shortly.",
          "Tez orada javob beramiz.",
        ),
        fields: ["name", "email", "message"],
        endpointPlaceholder: "https://your-api.example.com/leads",
      },
      {
        id: "sec-contact-block",
        type: "contact",
        heading: navLabel(language, "Контакты", "Contact", "Aloqa"),
        email: "hello@example.com",
      },
      {
        id: "sec-contact-footer",
        type: "footer",
        tagline: siteName,
        copyright: "© 2026",
      },
    ],
  };

  const gallery: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-gallery",
    slug: "gallery",
    title: navLabel(language, "Галерея", "Gallery", "Galereya"),
    sections: [
      {
        id: "sec-gallery-main",
        type: "gallery",
        heading: navLabel(language, "Портфолио", "Portfolio", "Portfolio"),
        items: [
          {
            title: navLabel(language, "Проект 1", "Project 1", "Loyiha 1"),
            description: navLabel(language, "Краткое описание кейса.", "Short case caption.", "Keys tavsifi."),
            imageAlt: navLabel(language, "Пример работы", "Sample work", "Namuna ish"),
          },
          {
            title: navLabel(language, "Проект 2", "Project 2", "Loyiha 2"),
            description: navLabel(language, "Добавьте детали.", "Add details.", "Tafsilot qo‘shing."),
            imageAlt: navLabel(language, "Пример работы 2", "Sample work 2", "Namuna 2"),
          },
        ],
      },
    ],
  };

  const testimonials: NonNullable<WebsiteSchema["pages"]>[number] = {
    id: "page-testimonials",
    slug: "testimonials",
    title: navLabel(language, "Отзывы", "Testimonials", "Sharhlar"),
    sections: [
      {
        id: "sec-testimonials-main",
        type: "testimonials",
        heading: navLabel(language, "Отзывы клиентов", "Client stories", "Mijozlar fikri"),
        items: [
          {
            quote: navLabel(
              language,
              "Отличный сервис и внимание к деталям.",
              "Great service and attention to detail.",
              "A’lo xizmat va diqqat.",
            ),
            author: navLabel(language, "Клиент", "Customer", "Mijoz"),
            role: navLabel(language, "CEO", "CEO", "CEO"),
          },
        ],
      },
    ],
  };

  const pages: NonNullable<WebsiteSchema["pages"]> = extended
    ? [home, about, services, gallery, pricing, testimonials, faq, contact]
    : [home, about, services, pricing, faq, contact];

  const navigation: WebsiteSchema["navigation"] = {
    items: pages.map((p) => ({
      label: p.title,
      href: `/${p.slug}`,
    })),
  };

  const draft: WebsiteSchema = {
    schemaVersion: "3",
    language,
    siteName,
    seo: {
      title: siteName,
      description: desc,
    },
    theme: DEFAULT_THEME,
    sections: [],
    pages,
    navigation,
  };

  return websiteSchema.parse(draft);
}
