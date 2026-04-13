import { resolvePublicAppOriginString } from "./resolve-public-app-origin";

/**
 * Mini App va HTTPS tugmalar uchun umumiy domen (oxirgi `/` siz).
 */
export function getPublicAppBaseUrl(): string {
  const raw = resolvePublicAppOriginString();
  if (!raw) {
    throw new Error("NEXT_PUBLIC_APP_URL yoki APP_BASE_URL sozlanmagan (production).");
  }
  return raw;
}

export function tryGetPublicAppBaseUrl(): string | null {
  return resolvePublicAppOriginString();
}
