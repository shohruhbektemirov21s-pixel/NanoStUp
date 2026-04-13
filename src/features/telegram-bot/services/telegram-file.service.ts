import "server-only";

import { AiEngineError } from "@/lib/ai/errors";

import type { BotContext } from "../context";

function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan.");
  }
  return token;
}

export function voiceFileNameFromPath(filePath: string): string {
  const name = filePath.split("/").pop() ?? "voice.ogg";
  const lower = name.toLowerCase();
  if (lower.endsWith(".oga")) {
    return "voice.oga";
  }
  if (lower.endsWith(".ogg")) {
    return "voice.ogg";
  }
  return "voice.ogg";
}

/**
 * Telegram ovozli xabar faylini yuklab olish (Whisper uchun buffer + fayl nomi).
 */
export async function downloadTelegramVoicePayload(
  ctx: BotContext,
  fileId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  let file;
  try {
    file = await ctx.api.getFile(fileId);
  } catch {
    throw new AiEngineError("Telegram API: fayl ma’lumotini olish muvaffaqiyatsiz.", "TRANSCRIPTION_FAILED");
  }

  if (!file.file_path) {
    throw new AiEngineError("Telegram fayl yo‘li (file_path) topilmadi.", "TRANSCRIPTION_FAILED");
  }

  const token = getTelegramBotToken();
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new AiEngineError("Telegram faylini yuklab olishda tarmoq xatosi.", "TRANSCRIPTION_FAILED");
  }

  if (!response.ok) {
    throw new AiEngineError(
      `Telegram faylini yuklab bo‘lmadi (HTTP ${response.status}).`,
      "TRANSCRIPTION_FAILED",
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch {
    throw new AiEngineError("Telegram fayl ma’lumotini o‘qib bo‘lmadi.", "TRANSCRIPTION_FAILED");
  }

  const fileName = voiceFileNameFromPath(file.file_path);
  return { buffer, fileName };
}
