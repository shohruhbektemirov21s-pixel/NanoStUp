import type { AppLocale } from "@/i18n/routing";

import type { SchemaPlanTier } from "./prompts-schema-spec";
import type { WebsiteSchema } from "./website-schema.zod";

export type WebsiteSchemaPromptSource = "text" | "voice_transcript";

export type WebsiteTemplateKind = "balanced" | "corporate" | "portfolio" | "landing";

export type GenerateWebsiteSchemaInput = {
  userPrompt: string;
  contentLocale?: AppLocale;
  promptSource?: WebsiteSchemaPromptSource;
  conversationContext?: string;
  planTier?: SchemaPlanTier;
  /** UI shablon — kontent uslubi va tuzilma og‘irligi */
  templateKind?: WebsiteTemplateKind;
  maxRetries?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export type GenerateWebsiteSchemaPipelineMeta = {
  recoveries?: string[];
  sanitization?: {
    removedControlChars: number;
    truncated: boolean;
  };
};

export type GenerateWebsiteSchemaOutput = {
  schema: WebsiteSchema;
  attemptsUsed: number;
  /** Model chiqimi Zod dan o‘tmaganida yagona zaxira shablon */
  usedFallback: boolean;
  warnings: string[];
  pipeline?: GenerateWebsiteSchemaPipelineMeta;
};
