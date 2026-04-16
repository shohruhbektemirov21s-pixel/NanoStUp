/** HTTPS (yoki reverse proxy orqali) — mobil brauzerlar uchun `Secure` cookie. */
export function shouldUseSecureCookies(request: Request): boolean {
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  if (process.env.FORCE_INSECURE_COOKIES === "1") {
    return false;
  }
  try {
    if (new URL(request.url).protocol === "https:") {
      return true;
    }
  } catch {
    /* ignore */
  }
  const raw = request.headers.get("x-forwarded-proto");
  const first = raw?.split(",")[0]?.trim().toLowerCase();
  return first === "https";
}
