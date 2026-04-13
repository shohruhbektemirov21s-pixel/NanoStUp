import "server-only";

import { postChatCompletion, resolveAiClientConfig } from "./chat-handler";
import { AiEngineError } from "./errors";
import { parseModelJson } from "./json-parse";
import { buildWebsiteThemeRefreshMessages } from "./prompts-refresh-theme";
import { websiteSchema, type WebsiteSchema } from "./website-schema.zod";

export type RegenerateWebsiteThemeInput = {
  schema: WebsiteSchema;
  signal?: AbortSignal;
};

/**
 * Gemini / boshqa model: sxema tuzilishi saqlangan, faqat `theme` yangilanadi.
 */
export async function regenerateWebsiteTheme(input: RegenerateWebsiteThemeInput): Promise<WebsiteSchema> {
  const config = resolveAiClientConfig();
  const raw = await postChatCompletion({
    config,
    messages: buildWebsiteThemeRefreshMessages(input.schema),
    temperature: 0.55,
    jsonMode: true,
    signal: input.signal,
  });

  let parsed: unknown;
  try {
    parsed = parseModelJson(raw);
  } catch (error) {
    throw new AiEngineError(
      error instanceof Error ? error.message : "JSON ajratilmadi",
      "INVALID_JSON",
      raw.slice(0, 800),
    );
  }

  const validated = websiteSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AiEngineError("Yangi tema sxemasi Zod tekshiruvidan o‘tmadi.", "VALIDATION_FAILED", validated.error.flatten());
  }

  return validated.data;
}
