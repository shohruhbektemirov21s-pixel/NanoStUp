import { InlineKeyboard } from "grammy";

import { PLATFORM_DEV_TELEGRAM_URL } from "@/shared/lib/platform-developer-footer";

export type StartWelcomeLang = "uz" | "ru" | "en";

/** Telegram `language_code` → start matni tili. */
export function resolveStartWelcomeLang(languageCode: string | undefined): StartWelcomeLang {
  const c = (languageCode ?? "uz").trim().toLowerCase();
  if (c.startsWith("ru") || c.startsWith("kk") || c.startsWith("be")) {
    return "ru";
  }
  if (c.startsWith("en")) {
    return "en";
  }
  if (c.startsWith("uz")) {
    return "uz";
  }
  return "uz";
}

/** Faqat `TELEGRAM_PORTFOLIO_URL` (HTTPS) — portfolio tayyor bo‘lganda `.env` ga qo‘shing. */
function resolvePortfolioUrl(): string | null {
  const raw = process.env.TELEGRAM_PORTFOLIO_URL?.trim();
  if (!raw) {
    return null;
  }
  const u = raw.replace(/\/$/, "");
  if (!/^https:\/\//i.test(u)) {
    return null;
  }
  return u;
}

const COPY: Record<
  StartWelcomeLang,
  {
    captionHtml: string;
    phoneButton: string;
    telegramButton: string;
    portfolioButton: string;
  }
> = {
  uz: {
    captionHtml: [
      "<b>Assalomu alaykum!</b> 🚀 <i>«Sayt yarat bot»</i>ga xush kelibsiz.",
      "",
      "Men sizning biznesingiz uchun <b>1 daqiqada</b> <i>professional sayt</i> yaratib beraman. Buning uchun menga <b>matn</b> yoki <b>ovozli</b> xabar yuboring.",
      "",
      "⚠️ <b>Muhim eslatma:</b> <i>Ushbu loyiha sun'iy intellekt imkoniyatlarini ko'rsatuvchi MVP (Minimum Viable Product) ko'rinishida yaratilgan. Saytni mukammal holatga keltirish va qo'shimcha funksiyalar qo'shish uchun dasturchi bilan maslahatlashish tavsiya etiladi.</i>",
      "",
      "<b>Buyruqlar:</b> <code>/my_sites</code> — saqlangan saytlar",
    ].join("\n"),
    phoneButton: "📞 Dasturchi bilan bog'lanish: +998501093514",
    telegramButton: "✈️ Telegram profil: @shohruhbek_2102",
    portfolioButton: "🌐 Portfolio",
  },
  ru: {
    captionHtml: [
      "<b>Здравствуйте!</b> 🚀 Добро пожаловать в бот <i>«Sayt yarat»</i>.",
      "",
      "Я помогу собрать <i>профессиональный сайт</i> для вашего бизнеса за <b>≈1 минуту</b>. Отправьте <b>текст</b> или <b>голосовое</b> сообщение.",
      "",
      "⚠️ <b>Важно:</b> <i>Это MVP на базе ИИ. Для продакшена, доработок и поддержки рекомендуем связаться с разработчиком.</i>",
      "",
      "<b>Команды:</b> <code>/my_sites</code> — сохранённые сайты",
    ].join("\n"),
    phoneButton: "📞 Связь с разработчиком: +998501093514",
    telegramButton: "✈️ Telegram: @shohruhbek_2102",
    portfolioButton: "🌐 Портфолио",
  },
  en: {
    captionHtml: [
      "<b>Hello!</b> 🚀 Welcome to <i>«Sayt yarat»</i> bot.",
      "",
      "I can build a <i>professional website</i> for your business in about <b>one minute</b>. Send a <b>text</b> or <b>voice</b> message.",
      "",
      "⚠️ <b>Important:</b> <i>This is an AI-powered MVP. For production polish, new features, and support, please consult the developer.</i>",
      "",
      "<b>Commands:</b> <code>/my_sites</code> — saved sites",
    ].join("\n"),
    phoneButton: "📞 Contact developer: +998501093514",
    telegramButton: "✈️ Telegram: @shohruhbek_2102",
    portfolioButton: "🌐 Portfolio",
  },
};

export function buildStartWelcomeCaptionHtml(lang: StartWelcomeLang): string {
  return COPY[lang].captionHtml;
}

export function buildStartWelcomeKeyboard(lang: StartWelcomeLang): InlineKeyboard {
  const c = COPY[lang];
  const portfolio = resolvePortfolioUrl();
  const kb = new InlineKeyboard()
    .text(c.phoneButton, "start:dev:phone")
    .url(c.telegramButton, PLATFORM_DEV_TELEGRAM_URL);
  if (portfolio) {
    kb.row().url(c.portfolioButton, portfolio);
  }
  return kb;
}
