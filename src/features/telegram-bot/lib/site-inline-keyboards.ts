import { InlineKeyboard } from "grammy";

import { telegramMiniAppUrl } from "@/lib/telegram/miniapp-url";

const MAX_CALLBACK = 64;

function assertCallbackData(data: string): void {
  if (data.length > MAX_CALLBACK) {
    throw new Error(`callback_data ${data.length} bayt — Telegram limiti ${MAX_CALLBACK}`);
  }
}

/**
 * Sayt uchun Mini App, ZIP va tahrir rejasi (inline) tugmalari.
 */
export function buildSiteActionsKeyboard(siteId: string): InlineKeyboard {
  const previewUrl = telegramMiniAppUrl(`/preview?site=${encodeURIComponent(siteId)}`);

  const zipData = `zip:${siteId}`;
  const titleData = `edit:title:${siteId}`;
  const themeData = `edit:theme:${siteId}`;
  const sectionsData = `edit:sections:${siteId}`;

  [zipData, titleData, themeData, sectionsData].forEach(assertCallbackData);

  const kb = new InlineKeyboard();

  if (previewUrl) {
    kb.webApp("🌐 Saytni ko‘rish", previewUrl).row();
  } else {
    kb.url("🌐 Sayt (HTTPS sozlang)", "https://core.telegram.org/bots/webapps").row();
  }

  kb.text("📦 ZIP", zipData)
    .text("✏️ Sarlavha", titleData)
    .row()
    .text("🎨 Tema", themeData)
    .text("📄 Bo‘limlar", sectionsData);

  return kb;
}
