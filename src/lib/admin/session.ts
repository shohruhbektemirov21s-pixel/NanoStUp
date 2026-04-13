import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

const COOKIE = "admin_session";

function adminSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-admin-secret-change-in-production"
  );
}

export function createAdminSessionToken(): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ v: 1, exp }), "utf8").toString("base64url");
  const sig = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [payload, sig] = parts;
  const expected = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return false;
  }
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    if (typeof body.exp !== "number" || body.exp < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isAdminSession(): boolean {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) {
    return false;
  }
  return verifyAdminSessionToken(raw);
}

export function clearAdminSessionCookie(): void {
  cookies().delete(COOKIE);
}

export const ADMIN_SESSION_COOKIE = COOKIE;
