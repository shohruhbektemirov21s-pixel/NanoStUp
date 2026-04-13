/**
 * Lokal rivojlantirish: long polling (webhook URL talab qilinmaydi).
 * Ishga tushirish: `TELEGRAM_BOT_TOKEN=... npx tsx scripts/telegram-dev.ts`
 */
async function main(): Promise<void> {
  const { ensureTelegramBotCommands, getTelegramBot } = await import("../src/features/telegram-bot");

  await ensureTelegramBotCommands();
  const bot = getTelegramBot();
  await bot.api.deleteWebhook({ drop_pending_updates: true });
  // eslint-disable-next-line no-console
  console.log("Telegram bot: long polling faol. Endi botga yozishingiz mumkin!");
  await bot.start();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
