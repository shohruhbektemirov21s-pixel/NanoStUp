import "server-only";

/**
 * Bot token orqali foydalanuvchiga to‘g‘ridan-to‘g‘ri xabar (admin tasdiqlash va hokazo).
 */
export async function sendTelegramOutboundMessage(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "no_bot_token" };
  }
  const id = chatId.replace(/\D/g, "");
  if (!id) {
    return { ok: false, error: "invalid_chat_id" };
  }
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: id, text, disable_web_page_preview: true }),
  });
  const body = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !body.ok) {
    return { ok: false, error: body.description ?? `http_${res.status}` };
  }
  return { ok: true };
}
