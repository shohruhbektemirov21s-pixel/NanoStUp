import { z } from "zod";

/** Prisma `cuid()` + zapas. */
export const MINIAPP_SITE_ID_MAX = 128;

export const miniappSiteIdSchema = z
  .string()
  .trim()
  .min(1, "missing")
  .max(MINIAPP_SITE_ID_MAX, "too_long");
