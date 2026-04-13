type EditMessageApi = {
  editMessageText: (
    chatId: number,
    messageId: number,
    text: string,
    extra?: { parse_mode?: "HTML" },
  ) => Promise<unknown>;
};

export type TelegramProgressHandle = {
  stop: () => void;
};

/**
 * Xabar matnini har soniyada yangilab, progress bar va teskari hisoblagich (default 60 s) ko‘rsatadi.
 * `generateWebsiteSchemaFromSpeech` kabi uzoq AI chaqiruvlari uchun.
 */
export function startTelegramGenerationProgress(
  api: EditMessageApi,
  chatId: number,
  messageId: number,
  options?: Readonly<{ totalSeconds?: number }>,
): TelegramProgressHandle {
  const totalSec = Math.max(15, Math.min(120, options?.totalSeconds ?? 60));
  const totalMs = totalSec * 1000;
  const t0 = Date.now();
  let stopped = false;

  const render = (): string => {
    const elapsed = Date.now() - t0;
    const secLeft = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
    const rawPct = (elapsed / totalMs) * 100;
    const pct = Math.min(99, Math.floor(rawPct));
    const filled = Math.min(10, Math.round(pct / 10));
    const bar = "█".repeat(filled) + "░".repeat(Math.max(0, 10 - filled));
    return (
      `⏳ <b>Sayt yaratilmoqda…</b>\n\n` +
      `<code>${bar}</code> <b>${pct}%</b>\n\n` +
      `⏱ Taxminan <b>${secLeft}</b> s qoldi\n\n` +
      `<i>Whisper → Gemini: sxema tayyorlanmoqda.</i>`
    );
  };

  const tick = async () => {
    if (stopped) {
      return;
    }
    try {
      await api.editMessageText(chatId, messageId, render(), { parse_mode: "HTML" });
    } catch {
      /* 429 / message not modified */
    }
  };

  void tick();
  const id = setInterval(() => void tick(), 1000);

  return {
    stop: () => {
      stopped = true;
      clearInterval(id);
    },
  };
}
