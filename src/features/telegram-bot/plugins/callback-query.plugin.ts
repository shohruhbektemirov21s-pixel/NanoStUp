import type { Bot } from "grammy";
import { InputFile } from "grammy";

import { PLATFORM_DEV_PHONE_TEL } from "@/shared/lib/platform-developer-footer";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { buildWebsiteZipUint8Array } from "@/shared/lib/build-website-zip";
import { slugifySiteFileName } from "@/shared/lib/slugify";

import type { BotContext } from "../context";
import { getSiteOwnedByTelegramUser } from "../services/site.service";

/**
 * Inline tugmalar: ZIP qayta yuklash, tahrir (reja) xabarlari.
 */
export function registerCallbackQueryPlugin(bot: Bot<BotContext>): void {
  bot.callbackQuery(/^start:dev:phone$/, async (ctx) => {
    try {
      await ctx.answerCallbackQuery({ url: PLATFORM_DEV_PHONE_TEL });
    } catch {
      try {
        await ctx.answerCallbackQuery({
          text: "+998501093514 — raqamni nusxalab, qo‘ng‘iroq ilovasidan tering.",
          show_alert: true,
        });
      } catch {
        /* ignore */
      }
    }
  });

  bot.callbackQuery(/^zip:([\w-]+)$/, async (ctx) => {
    const siteId = ctx.match?.[1];
    if (!siteId) {
      await ctx.answerCallbackQuery({ text: "Noto‘g‘ri ma’lumot." });
      return;
    }

    const from = ctx.from;
    if (!from) {
      await ctx.answerCallbackQuery({ text: "Foydalanuvchi topilmadi.", show_alert: true });
      return;
    }

    let site;
    try {
      site = await getSiteOwnedByTelegramUser(siteId, from.id);
    } catch (error) {
      console.error("[callback-query] getSite", error);
      await ctx.answerCallbackQuery({ text: "Ma’lumotlar bazasiga ulanishda muammo.", show_alert: true });
      return;
    }
    if (!site) {
      await ctx.answerCallbackQuery({ text: "Sayt topilmadi yoki sizga tegishli emas.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: "ZIP tayyorlanmoqda…" });

    const parsed = websiteSchema.safeParse(site.schemaJson);
    if (!parsed.success) {
      await ctx.reply("Sxema buzilgan — ZIP yaratib bo‘lmadi.");
      return;
    }

    try {
      const zipBytes = await buildWebsiteZipUint8Array(parsed.data);
      const fileName = `${slugifySiteFileName(site.title)}.zip`;
      await ctx.replyWithDocument(new InputFile(Buffer.from(zipBytes), fileName), {
        caption: `📦 ${site.title} — ZIP paket.`,
      });
    } catch {
      await ctx.reply("ZIP yaratishda xato. Keyinroq urinib ko‘ring.");
    }
  });

  bot.callbackQuery(/^edit:(title|theme|sections):([\w-]+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({
      text: "Tahrir: keyingi bosqichda Mini App ichida bloklarni yangilaysiz (hozircha reja).",
    });
  });
}
