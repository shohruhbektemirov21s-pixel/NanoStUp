import { GrammyError, HttpError, type Bot } from "grammy";

import type { BotContext } from "../context";
import { formatUserFacingError } from "../i18n/user-errors";

/**
 * Global xatoliklarni ushlash va foydalanuvchiga qisqa xabar.
 */
export function registerErrorHandler(bot: Bot<BotContext>): void {
  bot.catch(async (handlerError) => {
    const { ctx, error } = handlerError;
    console.error("[telegram-bot]", error);

    let message = formatUserFacingError(error);
    if (error instanceof GrammyError) {
      message = "Telegram API bilan muammo. Keyinroq urinib ko‘ring.";
    } else if (error instanceof HttpError) {
      message = "Tarmoq xatosi. Internet ulanishini tekshiring.";
    }

    try {
      if (ctx?.chat) {
        await ctx.reply(message);
      }
    } catch (replyError) {
      console.error("[telegram-bot] javob yuborish muvaffaqiyatsiz", replyError);
    }
  });
}
