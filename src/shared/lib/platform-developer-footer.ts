import { escapeAttr, escapeHtml } from "./escape-html";

/** Loyiha bo‘yicha yagona manbalar (preview / ZIP / UI). */
export const PLATFORM_DEV_PHONE_DISPLAY = "+998 50 109 35 14";
/** Kartochkada foydalanuvchi talab qilgan qisqa format. */
export const PLATFORM_DEV_PHONE_COMPACT = "+998501093514";
export const PLATFORM_DEV_PHONE_TEL = "tel:+998501093514";
export const PLATFORM_DEV_TELEGRAM_USERNAME = "shohruhbek_2102";
export const PLATFORM_DEV_TELEGRAM_URL = `https://t.me/${PLATFORM_DEV_TELEGRAM_USERNAME}`;
export const PLATFORM_DEV_TELEGRAM_HANDLE = `@${PLATFORM_DEV_TELEGRAM_USERNAME}`;

export type PlatformFooterLang = "uz" | "ru" | "en";

const ICO_PHONE = `<svg class="platform-dev-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

const ICO_SEND = `<svg class="platform-dev-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

export type PlatformDeveloperFooterStrings = {
  ariaLabel: string;
  disclaimer: string;
  contactTitle: string;
  phoneLabel: string;
  telegramLabel: string;
  rights: string;
};

const COPY: Record<PlatformFooterLang, PlatformDeveloperFooterStrings> = {
  uz: {
    ariaLabel: "Dasturchi kontakti va disclaimer",
    disclaimer:
      "Ushbu sayt sun'iy intellekt yordamida MVP (Minimum Viable Product) ko'rinishida tezkor yaratildi. Loyihani mukammal ishlash darajasiga keltirish, yangi funksiyalar qo'shish va texnik qo'llab-quvvatlash uchun dasturchi bilan bog'lanishingiz tavsiya etiladi.",
    contactTitle: "Dasturchi bilan bog'lanish:",
    phoneLabel: "Telefon",
    telegramLabel: "Telegram",
    rights: "BARCHA HUQUQLAR HIMOYALANGAN. © 2026 SHOHRUHBEK.",
  },
  ru: {
    ariaLabel: "Контакты разработчика и дисклеймер",
    disclaimer:
      "Этот сайт быстро создан с помощью искусственного интеллекта в виде MVP (минимально жизнеспособного продукта). Для вывода проекта в стабильную эксплуатацию, добавления новых функций и технической поддержки рекомендуется связаться с разработчиком.",
    contactTitle: "Связаться с разработчиком:",
    phoneLabel: "Телефон",
    telegramLabel: "Telegram",
    rights: "ВСЕ ПРАВА ЗАЩИЩЕНЫ. © 2026 SHOHRUHBEK.",
  },
  en: {
    ariaLabel: "Developer contact and disclaimer",
    disclaimer:
      "This site was rapidly built with artificial intelligence as an MVP (Minimum Viable Product). To bring the project to a production-ready level, add new features, and receive technical support, we recommend contacting the developer.",
    contactTitle: "Contact the developer:",
    phoneLabel: "Phone",
    telegramLabel: "Telegram",
    rights: "ALL RIGHTS RESERVED. © 2026 SHOHRUHBEK.",
  },
};

/** Mini App yoki boshqa intl-siz kontekstlar uchun. */
export function getPlatformDeveloperFooterStrings(lang: PlatformFooterLang): Readonly<PlatformDeveloperFooterStrings> {
  return COPY[lang];
}

export function resolvePlatformFooterLang(schemaLanguage: string): PlatformFooterLang {
  const L = schemaLanguage.trim().toLowerCase();
  if (L.startsWith("ru")) {
    return "ru";
  }
  if (L.startsWith("en")) {
    return "en";
  }
  return "uz";
}

export function platformDeveloperFooterCss(): string {
  return `
    .platform-dev-root { min-height: 100vh; padding-bottom: 280px; box-sizing: border-box; }
    @media (max-width: 520px) {
      .platform-dev-root { padding-bottom: 320px; }
    }
    .platform-dev-strip {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px));
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      color: #334155;
      background: linear-gradient(180deg, rgba(248,250,252,0.92) 0%, rgba(241,245,249,0.96) 100%);
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .platform-dev-panel {
      max-width: 720px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .platform-dev-disclaimer {
      margin: 0;
      font-size: 11px;
      line-height: 1.5;
      color: #64748b;
      text-align: center;
    }
    .platform-dev-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -4px rgba(15, 23, 42, 0.08);
      padding: 14px 16px 16px;
    }
    .platform-dev-card-title {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .platform-dev-links {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    @media (min-width: 480px) {
      .platform-dev-links { flex-direction: row; flex-wrap: wrap; gap: 14px 22px; }
    }
    .platform-dev-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      color: #0f172a;
      transition: color 0.15s ease;
    }
    .platform-dev-link:hover { color: #0284c7; }
    .platform-dev-ico {
      flex-shrink: 0;
      color: #64748b;
    }
    .platform-dev-link:hover .platform-dev-ico { color: #0284c7; }
    .platform-dev-link-k {
      display: block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 2px;
    }
    .platform-dev-rights {
      margin: 0;
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #94a3b8;
      text-transform: uppercase;
    }
  `.trim();
}

export function platformDeveloperFooterHtml(lang: PlatformFooterLang): string {
  const c = COPY[lang];
  const phoneHref = escapeAttr(PLATFORM_DEV_PHONE_TEL);
  const phoneShow = escapeHtml(PLATFORM_DEV_PHONE_COMPACT);
  const tgUrl = escapeAttr(PLATFORM_DEV_TELEGRAM_URL);
  const tgHandle = escapeHtml(PLATFORM_DEV_TELEGRAM_HANDLE);
  const phoneLabel = escapeHtml(c.phoneLabel);
  const telegramLabel = escapeHtml(c.telegramLabel);

  return `<footer class="platform-dev-strip" role="contentinfo" aria-label="${escapeAttr(c.ariaLabel)}">
  <div class="platform-dev-panel">
    <p class="platform-dev-disclaimer">${escapeHtml(c.disclaimer)}</p>
    <div class="platform-dev-card" role="region" aria-labelledby="platform-dev-card-h">
      <p id="platform-dev-card-h" class="platform-dev-card-title">${escapeHtml(c.contactTitle)}</p>
      <div class="platform-dev-links">
        <a class="platform-dev-link" href="${phoneHref}">
          ${ICO_PHONE}
          <span><span class="platform-dev-link-k">${phoneLabel}</span>${phoneShow}</span>
        </a>
        <a class="platform-dev-link" href="${tgUrl}" target="_blank" rel="noopener noreferrer">
          ${ICO_SEND}
          <span><span class="platform-dev-link-k">${telegramLabel}</span>${tgHandle}</span>
        </a>
      </div>
    </div>
    <p class="platform-dev-rights">${escapeHtml(c.rights)}</p>
  </div>
</footer>`;
}

export function wrapHtmlBodyWithPlatformFooter(mainInnerHtml: string, lang: PlatformFooterLang): string {
  return `<div class="platform-dev-root">${mainInnerHtml}${platformDeveloperFooterHtml(lang)}</div>`;
}
