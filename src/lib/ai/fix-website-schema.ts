import "server-only";

import { ZodError } from "zod";

import type { AppLocale } from "@/i18n/routing";

import { postChatCompletion, resolveAiClientConfig, type ResolvedAiClientConfig } from "./chat-handler";
import { AiEngineError } from "./errors";
import { parseModelJsonWithRecovery } from "./pipeline/json-recovery";
import { preprocessWebsiteJsonCandidate } from "./pipeline/schema-preprocess";
import {
  logWebsiteAiPipelineInfo,
  logWebsiteAiPipelineWarn,
} from "./pipeline/pipeline-logger";
import { withTransientHttpRetry } from "./pipeline/transient-retry";
import type { SchemaPlanTier } from "./prompts-schema-spec";
import { buildWebsiteFixMessages } from "./prompts-fix-website";
import { websiteSchema, type WebsiteSchema } from "./website-schema.zod";

export type FixWebsiteSchemaInput = {
  schema: WebsiteSchema;
  userIssue: string;
  contentLocale?: AppLocale;
  planTier?: SchemaPlanTier;
  maxRetries?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export type FixWebsiteSchemaOutput = {
  schema: WebsiteSchema;
  attemptsUsed: number;
};

function formatZodIssues(error: ZodError): string {
  return JSON.stringify(error.flatten(), null, 2);
}

export async function fixWebsiteSchemaFromUserReport(input: FixWebsiteSchemaInput): Promise<FixWebsiteSchemaOutput> {
  const maxRetries = Math.min(3, Math.max(1, input.maxRetries ?? 3));
  if (maxRetries < 1) {
    throw new AiEngineError("maxRetries kamida 1 bo'lishi kerak", "VALIDATION_FAILED");
  }

  let config: ResolvedAiClientConfig;
  try {
    config = resolveAiClientConfig();
  } catch (error) {
    if (error instanceof AiEngineError) {
      throw error;
    }
    throw new AiEngineError(
      error instanceof Error ? error.message : "AI muhit sozlamalari o‘qilmadi.",
      "MISSING_PROVIDER",
    );
  }

  const schemaJson = JSON.stringify(input.schema);
  let repairHint: string | undefined;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    attemptsUsed = attempt;
    const messages = buildWebsiteFixMessages({
      schemaJson,
      userIssue: input.userIssue,
      contentLocale: input.contentLocale,
      repairHint,
      planTier: input.planTier,
    });

    let raw: string;
    try {
      const call = () =>
        postChatCompletion({
          config,
          messages,
          temperature: input.temperature ?? 0.25,
          jsonMode: true,
          signal: input.signal,
        });
      raw =
        config.provider === "google"
          ? await call()
          : await withTransientHttpRetry(call, {
              operationLabel: "postChatCompletion_fix",
              maxAttempts: 3,
              baseDelayMs: 450,
            });
    } catch (error) {
      if (error instanceof AiEngineError) {
        throw error;
      }
      throw new AiEngineError(
        error instanceof Error ? error.message : "AI tarmoq xatosi.",
        "HTTP_ERROR",
        error,
      );
    }

    const recovered = parseModelJsonWithRecovery(raw);
    if (!recovered.ok) {
      logWebsiteAiPipelineWarn({
        event: "fix_json_parse_failed",
        stage: "json_parse",
        attempt,
        message: recovered.error.message,
      });
      repairHint = [
        "JSON formati noto'g'ri yoki ajratib bo'lmadi.",
        recovered.error.message,
        "Model chiqimi (qisqartirilgan):",
        raw.slice(0, 4000),
      ].join("\n");
      continue;
    }
    const parsed = recovered.value;
    if (recovered.recoveries.length > 0) {
      logWebsiteAiPipelineInfo({
        event: "fix_json_recovered",
        stage: "json_parse",
        attempt,
        recoveries: recovered.recoveries,
      });
    }

    const validated = websiteSchema.safeParse(preprocessWebsiteJsonCandidate(parsed));
    if (validated.success) {
      return { schema: validated.data, attemptsUsed };
    }

    repairHint = [
      "Zod validatsiyasi o'tmadi. Quyidagi xatolarni tuzat va FAQAT to'g'ri JSON qaytar:",
      formatZodIssues(validated.error),
      "Model chiqimi (qisqartirilgan):",
      raw.slice(0, 4000),
    ].join("\n");
  }

  throw new AiEngineError(
    `AI ${maxRetries} marta urinishdan keyin ham to'g'ri WebsiteSchema bermadi.`,
    "VALIDATION_FAILED",
    repairHint,
  );
}
