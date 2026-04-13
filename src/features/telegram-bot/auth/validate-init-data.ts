import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  /** https://core.telegram.org/bots/webapps#webappuser */
  photo_url?: string;
};

export type ValidatedMiniAppInit = {
  raw: Record<string, string>;
  user: TelegramWebAppUser;
  authDate: number;
  queryId?: string;
};

/**
 * Telegram Mini App `initData` — https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86_400,
): { ok: true; data: ValidatedMiniAppInit } | { ok: false; reason: string } {
  const trimmed = initData.trim();
  if (!trimmed) {
    return { ok: false, reason: "initData bo‘sh." };
  }

  const params = new URLSearchParams(trimmed);
  const hash = params.get("hash");
  if (!hash) {
    return { ok: false, reason: "hash parametri yo‘q." };
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number.parseInt(authDateRaw, 10) : Number.NaN;
  if (!Number.isFinite(authDate)) {
    return { ok: false, reason: "auth_date noto‘g‘ri." };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - authDate);
  if (age > maxAgeSeconds) {
    return { ok: false, reason: "initData eskirgan (auth_date)." };
  }

  const pairs: string[] = [];
  const sortedEntries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of sortedEntries) {
    if (key === "hash") {
      continue;
    }
    pairs.push(`${key}=${value}`);
  }
  const dataCheckString = pairs.join("\n");

  const normalizedHash = hash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
    return { ok: false, reason: "hash formati noto‘g‘ri." };
  }

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const signature = createHmac("sha256", secretKey).update(dataCheckString, "utf8").digest();
  const provided = Buffer.from(normalizedHash, "hex");
  if (provided.length !== signature.length || !timingSafeEqual(signature, provided)) {
    return { ok: false, reason: "initData imzo tekshiruvi muvaffaqiyatsiz." };
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    return { ok: false, reason: "user parametri yo‘q." };
  }

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    return { ok: false, reason: "user JSON emas." };
  }

  if (typeof user.id !== "number") {
    return { ok: false, reason: "user.id noto‘g‘ri." };
  }

  const raw: Record<string, string> = {};
  for (const [k, v] of Array.from(params.entries())) {
    raw[k] = v;
  }

  const queryId = params.get("query_id") ?? undefined;

  return {
    ok: true,
    data: {
      raw,
      user,
      authDate,
      queryId,
    },
  };
}

export function getBotTokenForMiniApp(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan.");
  }
  return token;
}
