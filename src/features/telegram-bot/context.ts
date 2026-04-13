import type { ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";

/**
 * Conversation plugin o‘z holatini session orqali saqlaydi.
 */
export type TelegramSessionRecord = Record<string, unknown>;

export type BotContext = Context & SessionFlavor<TelegramSessionRecord> & ConversationFlavor;
