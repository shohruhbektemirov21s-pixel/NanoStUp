import { ensureTelegramBotCommands, getTelegramWebhookHandler } from "@/features/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return new Response("Ruxsat yo‘q", { status: 401 });
    }
  }

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return new Response("Telegram bot sozlanmagan (TELEGRAM_BOT_TOKEN yo‘q).", { status: 503 });
  }

  try {
    try {
      await ensureTelegramBotCommands();
    } catch (cmdError) {
      console.warn("[telegram-webhook] setMyCommands xato (davom etamiz):", cmdError);
    }
    const handle = getTelegramWebhookHandler();
    return await handle(request);
  } catch (error) {
    console.error("[telegram-webhook]", error);
    return new Response("Telegram bot sozlanmagan yoki ishga tushmadi.", { status: 503 });
  }
}
