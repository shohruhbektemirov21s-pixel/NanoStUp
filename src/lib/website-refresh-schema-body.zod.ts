import { z } from "zod";

const localeEnum = z.enum(["uz", "ru", "en"]);

/** POST /api/website/refresh-design */
export const websiteRefreshSchemaBodySchema = z
  .object({
    schema: z.unknown(),
    locale: localeEnum.optional(),
  })
  .strip();

export type WebsiteRefreshSchemaBody = z.infer<typeof websiteRefreshSchemaBodySchema>;
