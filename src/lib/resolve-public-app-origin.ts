/**
 * Brauzer / Telegram WebApp uchun sayt origin (path va query siz).
 * Dev: `NEXT_PUBLIC_DEV_PORT`, keyin `PORT`, so‘ng 3001 (turbo tez-tez shu portda).
 * Prod: `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL` yoki Vercel.
 */
export function resolvePublicAppOriginString(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "");

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    const port =
      process.env.NEXT_PUBLIC_DEV_PORT?.trim() ||
      process.env.PORT?.trim() ||
      "3001";
    return `http://localhost:${port}`;
  }

  return null;
}

export function resolvePublicAppMetadataBase(): URL | undefined {
  const origin = resolvePublicAppOriginString();
  if (!origin) {
    return undefined;
  }
  try {
    return new URL(origin.endsWith("/") ? origin.slice(0, -1) : origin);
  } catch {
    return undefined;
  }
}
