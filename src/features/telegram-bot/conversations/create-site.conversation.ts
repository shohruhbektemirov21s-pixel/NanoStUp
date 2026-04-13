import type { Conversation } from "@grammyjs/conversations";

import type { WebsiteSchemaPromptSource } from "@/lib/ai/prompts";
import { generateWebsiteSchemaFromSpeech } from "@/lib/ai/generate-website-schema";
import { transcribeAudioWithWhisper } from "@/lib/ai/transcribe-whisper";
import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";

import type { BotContext } from "../context";
import { formatUserFacingError } from "../i18n/user-errors";
import { startTelegramGenerationProgress } from "../lib/telegram-generation-progress";
import { createSiteForUser } from "../services/site.service";
import { sendSiteCreatedBundle } from "../services/site-delivery.service";
import { downloadTelegramVoicePayload } from "../services/telegram-file.service";
import { upsertUserFromTelegramContext } from "../services/user.service";

type EditOpts = { parse_mode?: "HTML" };

async function safeEditMessageText(
  ctx: BotContext,
  chatId: number,
  messageId: number,
  text: string,
  opts?: EditOpts,
): Promise<void> {
  try {
    await ctx.api.editMessageText(chatId, messageId, text, { parse_mode: opts?.parse_mode });
  } catch {
    await ctx.reply(text, { parse_mode: opts?.parse_mode });
  }
}

async function completeSiteGeneration(
  ctx: BotContext,
  businessText: string,
  promptSource: WebsiteSchemaPromptSource,
): Promise<void> {
  await ctx.replyWithChatAction("typing");
  const { schema, attemptsUsed } = await generateWebsiteSchemaFromSpeech({
    userPrompt: businessText,
    promptSource,
    contentLocale: "uz",
  });
  const user = await upsertUserFromTelegramContext(ctx);
  const site = await createSiteForUser(user.id, schema);
  await sendSiteCreatedBundle(ctx, site, { attemptsUsed });
}

async function runGenerationWithProgress(
  ctx: BotContext,
  chatId: number,
  messageId: number,
  businessText: string,
  promptSource: WebsiteSchemaPromptSource,
): Promise<void> {
  const { stop } = startTelegramGenerationProgress(ctx.api, chatId, messageId, { totalSeconds: 60 });
  try {
    await completeSiteGeneration(ctx, businessText, promptSource);
  } finally {
    stop();
  }
}

/**
 * /start dan keyin yoki /create — matn yoki ovoz; ovoz → Whisper → AI (Gemini).
 */
export async function createSiteConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  await ctx.reply(
    [
      "👇 <b>Biznesingizni matn yoki 🎤 ovoz bilan yozing.</b>",
      "",
      "Bekor qilish: <code>/cancel</code>",
    ].join("\n"),
    { parse_mode: "HTML" },
  );

  while (true) {
    const nextCtx = await conversation.wait();
    const caption = nextCtx.message?.caption?.trim();
    const text = nextCtx.message?.text?.trim();
    const voice = nextCtx.message?.voice;

    if (caption === "/cancel" || text === "/cancel" || text?.startsWith("/cancel ")) {
      await nextCtx.reply("Jarayon bekor qilindi.");
      return;
    }

    if (voice) {
      await nextCtx.replyWithChatAction("typing");
      const statusMsg = await nextCtx.reply("⏳ Ovozingiz tahlil qilinmoqda…");
      const chatId = statusMsg.chat.id;
      const messageId = statusMsg.message_id;

      try {
        await safeEditMessageText(
          nextCtx,
          chatId,
          messageId,
          "⏳ Ovoz fayli yuklanmoqda va <b>Whisper</b> tahlil qilmoqda…",
          { parse_mode: "HTML" },
        );

        const { buffer, fileName } = await downloadTelegramVoicePayload(nextCtx, voice.file_id);

        await safeEditMessageText(
          nextCtx,
          chatId,
          messageId,
          "⏳ <b>Whisper</b> ovozni matnga aylantirmoqda…",
          { parse_mode: "HTML" },
        );

        const transcript = (await transcribeAudioWithWhisper({ buffer, fileName })).trim();

        if (!transcript) {
          await safeEditMessageText(
            nextCtx,
            chatId,
            messageId,
            "❌ Ovozdan matn ajratilmadi. Qisqa va aniq gapirib, qayta yuboring.",
          );
          continue;
        }

        if (transcript.length > WEBSITE_PROMPT_MAX_CHARS) {
          await safeEditMessageText(
            nextCtx,
            chatId,
            messageId,
            `❌ Matn juda uzun (maks. ${WEBSITE_PROMPT_MAX_CHARS} belgi). Matnni qisqartirib qayta yuboring.`,
          );
          continue;
        }

        await safeEditMessageText(
          nextCtx,
          chatId,
          messageId,
          "✅ Matn tayyor. <b>Gemini</b> sayt sxemasini yozyapti…",
          { parse_mode: "HTML" },
        );

        await runGenerationWithProgress(nextCtx, chatId, messageId, transcript, "voice_transcript");
        await safeEditMessageText(nextCtx, chatId, messageId, "✅ Tayyor — natija pastda.", { parse_mode: "HTML" });
        return;
      } catch (error) {
        await safeEditMessageText(
          nextCtx,
          chatId,
          messageId,
          `❌ ${formatUserFacingError(error)}`,
        );
        return;
      }
    }

    if (!text) {
      await nextCtx.reply("Matn yoki ovozli xabar yuboring. Bekor: /cancel");
      continue;
    }

    if (text.startsWith("/")) {
      await nextCtx.reply("Hozir faqat oddiy matn yoki ovoz yuboring. Bekor: /cancel");
      continue;
    }

    if (text.length > WEBSITE_PROMPT_MAX_CHARS) {
      await nextCtx.reply(
        `Matn juda uzun. Eng koʻpi ${WEBSITE_PROMPT_MAX_CHARS} belgi yuborish mumkin — qisqartirib qayta urinib ko‘ring.`,
      );
      continue;
    }

    try {
      await nextCtx.replyWithChatAction("typing");
      const statusMsg = await nextCtx.reply("⏳ <b>Sayt yaratilmoqda…</b>", { parse_mode: "HTML" });
      await runGenerationWithProgress(
        nextCtx,
        statusMsg.chat.id,
        statusMsg.message_id,
        text,
        "text",
      );
      await safeEditMessageText(
        nextCtx,
        statusMsg.chat.id,
        statusMsg.message_id,
        "✅ Tayyor — natija pastda.",
        { parse_mode: "HTML" },
      );
      return;
    } catch (error) {
      await nextCtx.reply(formatUserFacingError(error));
      return;
    }
  }
}
