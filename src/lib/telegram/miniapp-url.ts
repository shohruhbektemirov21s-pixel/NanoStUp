import "server-only";

import { tryGetPublicAppBaseUrl } from "@/lib/public-app-url";

/**
 * HTTPS origin + path prefix for Mini App routes (`/miniapp/...`).
 * `TELEGRAM_WEBAPP_URL` — to‘liq kirish nuqtasi (masalan `https://domen.uz/miniapp`).
 */
export function getTelegramMiniAppOrigin(): string | null {
  const custom = process.env.TELEGRAM_WEBAPP_URL?.trim().replace(/\/$/, "");
  if (custom && /^https:\/\//i.test(custom)) {
    return custom;
  }
  const base = tryGetPublicAppBaseUrl();
  if (!base) {
    return null;
  }
  return `${base.replace(/\/$/, "")}/miniapp`;
}

/** @param path masalan `/`, `/builder`, `/pricing` */
export function telegramMiniAppUrl(path: string): string | null {
  const origin = getTelegramMiniAppOrigin();
  if (!origin) {
    return null;
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/") {
    return origin;
  }
  return `${origin}${p}`;
}
