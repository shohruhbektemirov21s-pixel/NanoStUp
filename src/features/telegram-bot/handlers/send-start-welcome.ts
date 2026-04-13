import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { InputFile } from "grammy";

import type { BotContext } from "../context";
import {
  buildStartWelcomeCaptionHtml,
  buildStartWelcomeKeyboard,
  resolveStartWelcomeLang,
} from "../i18n/start-welcome";
import { buildTelegramMainMenuReplyKeyboard } from "../lib/main-menu-keyboard";
const LOCAL_LOGO_REL = join("public", "telegram", "usta-ai-start.png");

/**
 * Rasm manbai (birinchi topilgani ishlatiladi):
 * - `TELEGRAM_START_PHOTO_FILE_ID` — Telegram `file_id` (tez, serverda fayl yo‘q).
 * - `TELEGRAM_START_PHOTO_URL` — HTTPS rasm URL (Telegram yuklab oladi).
 * - `public/telegram/usta-ai-start.png` — loyiha ichidagi fayl (hozircha placeholder; o‘zingizning logotipingiz bilan almashtiring).
 * - `TELEGRAM_PORTFOLIO_URL` — HTTPS portfolio havolasi (bo‘lsa, /start menyusida 🌐 tugmasi chiqadi).
 */
function resolveStartPhoto(): string | InputFile | null {
  const fileId = process.env.TELEGRAM_START_PHOTO_FILE_ID?.trim();
  if (fileId) {
    return fileId;
  }
  const photoUrl = process.env.TELEGRAM_START_PHOTO_URL?.trim();
  if (photoUrl && (photoUrl.startsWith("https://") || photoUrl.startsWith("http://"))) {
    return photoUrl;
  }
  const abs = join(process.cwd(), LOCAL_LOGO_REL);
  if (existsSync(abs)) {
    return new InputFile(abs);
  }
  return null;
}

/**
 * /start — «Sayt yarat bot» salomi, MVP disclaimer, HTML, rasm (ixtiyoriy), inline tugmalar.
 */
export async function sendStartWelcome(ctx: BotContext): Promise<void> {
  const lang = resolveStartWelcomeLang(ctx.from?.language_code);
  const caption = buildStartWelcomeCaptionHtml(lang);
  const reply_markup = buildStartWelcomeKeyboard(lang);

  const photo = resolveStartPhoto();
  const payload = {
    caption,
    parse_mode: "HTML" as const,
    reply_markup,
  };

  if (photo) {
    try {
      await ctx.replyWithPhoto(photo, payload);
    } catch (error) {
      console.warn("[telegram/start] replyWithPhoto failed, falling back to text", error);
      await ctx.reply(caption, {
        parse_mode: "HTML",
        reply_markup,
      });
    }
  } else {
    await ctx.reply(caption, {
      parse_mode: "HTML",
      reply_markup,
    });
  }

  const mainMenu = buildTelegramMainMenuReplyKeyboard();
  if (mainMenu) {
    await ctx.reply("👇 <b>Quyidagi tugmalar orqali ilovani oching.</b> HTTPS domen sozlangan bo‘lishi kerak.", {
      parse_mode: "HTML",
      reply_markup: mainMenu,
    });
  }
}
