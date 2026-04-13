import "server-only";

import { createConversation, conversations } from "@grammyjs/conversations";
import { Bot, session, webhookCallback } from "grammy";

import { createSiteConversation } from "../conversations/create-site.conversation";
import type { BotContext } from "../context";
import { registerCallbackQueryPlugin } from "../plugins/callback-query.plugin";
import { registerCommandPlugin } from "../plugins/commands.plugin";
import { registerErrorHandler } from "../plugins/error-handler.plugin";
import { createPrismaSessionStorage } from "../storage/prisma-session.storage";

let cachedBot: Bot<BotContext> | null = null;
let cachedWebhookHandler: ((req: Request) => Promise<Response>) | null = null;

export function getTelegramBot(): Bot<BotContext> {
  if (cachedBot) {
    return cachedBot;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan.");
  }

  const bot = new Bot<BotContext>(token);

  registerErrorHandler(bot);

  const storage = createPrismaSessionStorage();
  bot.use(session({ storage, initial: () => ({}) }));
  bot.use(conversations());
  bot.use(createConversation(createSiteConversation, "createSite"));

  registerCommandPlugin(bot);
  registerCallbackQueryPlugin(bot);

  cachedBot = bot;
  return bot;
}

export function getTelegramWebhookHandler(): (req: Request) => Promise<Response> {
  if (!cachedWebhookHandler) {
    cachedWebhookHandler = webhookCallback(getTelegramBot(), "std/http");
  }
  return cachedWebhookHandler;
}

let commandsPromise: Promise<void> | null = null;

export function ensureTelegramBotCommands(): Promise<void> {
  if (!commandsPromise) {
    const bot = getTelegramBot();
    commandsPromise = bot.api
      .setMyCommands([
        { command: "start", description: "Bosh menyu va Mini App" },
        { command: "builder", description: "Mini App: sayt yaratish" },
        { command: "projects", description: "Loyihalar (Mini App)" },
        { command: "subscription", description: "Tariflar va obuna" },
        { command: "account", description: "Akkaunt (Mini App)" },
        { command: "help", description: "Yordam" },
        { command: "support", description: "Qo‘llab-quvvatlash" },
        { command: "create", description: "Botda yangi sayt (matn/ovoz)" },
        { command: "my_sites", description: "Saqlangan saytlar (bot)" },
      ])
      .then(() => undefined)
      .catch((error) => {
        commandsPromise = null;
        throw error;
      });
  }
  return commandsPromise;
}
