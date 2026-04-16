import { shouldUseSecureCookies } from "@/lib/http/should-use-secure-cookies";

const TWO_WEEKS_SEC = 14 * 24 * 60 * 60;

export function builderSessionSetCookieOptions(
  request: Request,
  maxAgeSeconds = TWO_WEEKS_SEC,
): { httpOnly: true; sameSite: "lax"; path: string; maxAge: number; secure: boolean } {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    secure: shouldUseSecureCookies(request),
  };
}

export function builderSessionClearCookieOptions(
  request: Request,
): { httpOnly: true; sameSite: "lax"; path: string; maxAge: number; secure: boolean } {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: shouldUseSecureCookies(request),
  };
}
