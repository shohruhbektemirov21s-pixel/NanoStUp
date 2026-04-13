import "server-only";

import { Keyboard } from "grammy";

import { telegramMiniAppUrl } from "@/lib/telegram/miniapp-url";

/**
 * Doimiy pastki menyu — Mini App sahifalariga `web_app` tugmalari (HTTPS kerak).
 */
export function buildTelegramMainMenuReplyKeyboard(): Keyboard | null {
  const home = telegramMiniAppUrl("/");
  const builder = telegramMiniAppUrl("/builder");
  const pricing = telegramMiniAppUrl("/pricing");
  const subscription = telegramMiniAppUrl("/subscription");
  const projects = telegramMiniAppUrl("/projects");
  const account = telegramMiniAppUrl("/account");
  const support = telegramMiniAppUrl("/support");
  if (!home || !builder || !pricing || !subscription || !projects || !account || !support) {
    return null;
  }

  return new Keyboard()
    .webApp("Sayt yaratish", builder)
    .webApp("Tariflar", pricing)
    .row()
    .webApp("Loyihalarim", projects)
    .webApp("Obunam", subscription)
    .row()
    .webApp("Akkauntim", account)
    .webApp("Yordam", support)
    .resized()
    .persistent();
}
