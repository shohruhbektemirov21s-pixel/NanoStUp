import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { getBotTokenForMiniApp, validateTelegramWebAppInitData } from "@/features/telegram-bot/auth/validate-init-data";
import { upsertUserFromTelegramProfile } from "@/features/telegram-bot/services/user.service";
import { getClientIpFromRequest } from "@/lib/rate-limit/get-client-ip";
import { checkSlidingWindowRateLimit } from "@/lib/rate-limit/memory-sliding-window";
import { createMiniappSessionToken, MINIAPP_SESSION_COOKIE } from "@/lib/telegram/miniapp-session";

export const runtime = "nodejs";

const bodySchema = z.object({
  initData: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIpFromRequest(request);
  const rl = checkSlidingWindowRateLimit({
    key: `miniapp-auth:${ip}`,
    windowMs: 60_000,
    maxInWindow: 45,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  let botToken: string;
  try {
    botToken = getBotTokenForMiniApp();
  } catch {
    return NextResponse.json({ ok: false, error: "misconfigured" }, { status: 503 });
  }

  const validated = validateTelegramWebAppInitData(parsed.data.initData, botToken);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: "initdata_invalid", reason: validated.reason }, { status: 401 });
  }

  const u = validated.data.user;
  const row = await upsertUserFromTelegramProfile({
    telegramNumericId: u.id,
    username: u.username ?? null,
    firstName: u.first_name ?? null,
    lastName: u.last_name ?? null,
    languageCode: u.language_code ?? null,
    photoUrl: typeof u.photo_url === "string" ? u.photo_url : null,
    touchMiniApp: true,
  });

  const token = createMiniappSessionToken({
    userId: row.id,
    telegramId: row.telegramId,
    sessionVersion: row.miniappSessionVersion,
  });

  const jar = cookies();
  jar.set(MINIAPP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: row.id,
      firstName: row.firstName,
      authSource: row.authSource,
    },
  });
}
