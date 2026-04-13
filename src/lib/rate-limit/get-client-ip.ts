/**
 * Edge / reverse-proxy orqali kelgan mijoz IP (xavfsizlik: faqat rate-limit kaliti).
 */
export function getClientIpFromRequest(request: Request): string {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first.slice(0, 128);
    }
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) {
    return real.slice(0, 128);
  }
  return "unknown";
}
