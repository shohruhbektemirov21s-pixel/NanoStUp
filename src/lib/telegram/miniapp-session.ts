import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const MINIAPP_SESSION_COOKIE = "tg_miniapp";

function miniappSecret(): string {
  return (
    process.env.MINIAPP_SESSION_SECRET?.trim() ||
    process.env.BUILDER_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-miniapp-secret-change-in-production"
  );
}

export type MiniappSessionPayload = {
  userId: string;
  telegramId: string;
  sessionVersion: number;
};

export function createMiniappSessionToken(payload: MiniappSessionPayload): string {
  const exp = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const body = Buffer.from(
    JSON.stringify({
      v: 1,
      exp,
      uid: payload.userId,
      tid: payload.telegramId,
      sv: payload.sessionVersion,
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", miniappSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseMiniappSessionToken(token: string): MiniappSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [body, sig] = parts;
  const expected = createHmac("sha256", miniappSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      v?: number;
      exp?: number;
      uid?: string;
      tid?: string;
      sv?: number;
    };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null;
    }
    if (typeof parsed.uid !== "string" || typeof parsed.tid !== "string") {
      return null;
    }
    const sv = typeof parsed.sv === "number" && Number.isFinite(parsed.sv) ? Math.floor(parsed.sv) : 0;
    return { userId: parsed.uid, telegramId: parsed.tid, sessionVersion: sv };
  } catch {
    return null;
  }
}

export function readMiniappSessionFromCookies(): MiniappSessionPayload | null {
  const raw = cookies().get(MINIAPP_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  return parseMiniappSessionToken(raw);
}
