/**
 * Brauzerda joriy origin bilan API URL (client component ichidagi handlerlar uchun).
 */
export function clientApiUrl(path: string): string {
  if (typeof window === "undefined") {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const origin = window.location.origin.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
