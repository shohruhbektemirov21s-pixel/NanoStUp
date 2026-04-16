import "server-only";

import { ZodError } from "zod";

import type { AppLocale } from "@/i18n/routing";

import { applyRegenerationPatch } from "./apply-regeneration-patch";
import { AiEngineError } from "./errors";
import type { FeedbackIntent } from "./feedback-intent";
import { parseFeedbackIntent } from "./feedback-intent";
import { postChatCompletion, resolveAiClientConfig, type ResolvedAiClientConfig } from "./chat-handler";
import { parseModelJsonWithRecovery } from "./pipeline/json-recovery";
import {
  logWebsiteAiPipelineInfo,
  logWebsiteAiPipelineWarn,
} from "./pipeline/pipeline-logger";
import { preprocessWebsiteJsonCandidate } from "./pipeline/schema-preprocess";
import { withTransientHttpRetry } from "./pipeline/transient-retry";
import type { SchemaPlanTier } from "./prompts-schema-spec";
import { buildTargetedWebsiteRegenerationMessages } from "./prompts-targeted-regeneration";
import { regenerationLlmEnvelopeSchema } from "./website-regeneration-patch.zod";
import { websiteSchema, type WebsiteSchema } from "./website-schema.zod";

export type TargetedWebsiteRegenerationInput = {
  schema: WebsiteSchema;
  feedback: string;
  contentLocale?: AppLocale;
  planTier?: SchemaPlanTier;
  maxRetries?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export type TargetedWebsiteRegenerationOutput = {
  schema: WebsiteSchema;
  attemptsUsed: number;
  intent: FeedbackIntent;
  usedFullSchemaFallback: boolean;
};

function formatZodIssues(error: ZodError): string {
  return JSON.stringify(error.flatten(), null, 2);
}

function tryFullWebsiteReplace(parsed: unknown): { schema: WebsiteSchema } | null {
  const preprocessed = preprocessWebsiteJsonCandidate(parsed);
  const validated = websiteSchema.safeParse(preprocessed);
  if (validated.success) {
    return { schema: validated.data };
  }
  return null;
}

export async function targetedWebsiteRegeneration(
  input: TargetedWebsiteRegenerationInput,
): Promise<TargetedWebsiteRegenerationOutput> {
  const maxRetries = Math.min(4, Math.max(1, input.maxRetries ?? 3));
  const intent = parseFeedbackIntent(input.feedback);
  const versionSnapshot = structuredClone(input.schema) as WebsiteSchema;

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
    const messages = buildTargetedWebsiteRegenerationMessages({
      schemaJson,
      feedback: input.feedback,
      intent,
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
          temperature: input.temperature ?? 0.28,
          jsonMode: true,
          signal: input.signal,
        });
      raw =
        config.provider === "google"
          ? await call()
          : await withTransientHttpRetry(call, {
              operationLabel: "postChatCompletion_regenerate",
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
        event: "regenerate_json_parse_failed",
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
        event: "regenerate_json_recovered",
        stage: "json_parse",
        attempt,
        recoveries: recovered.recoveries,
      });
    }

    const asRecord = parsed as Record<string, unknown>;
    let usedFullSchemaFallback = false;

    if (asRecord && typeof asRecord.schemaVersion === "string" && asRecord.siteName) {
      const full = tryFullWebsiteReplace(parsed);
      if (full) {
        usedFullSchemaFallback = true;
        return { schema: full.schema, attemptsUsed, intent, usedFullSchemaFallback };
      }
    }

    const envelope = regenerationLlmEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      repairHint = [
        "Kutilgan format: faqat { \"patch\": { ... } } yoki to'liq WebsiteSchema.",
        "Zod (envelope):",
        formatZodIssues(envelope.error),
        "Model chiqimi (qisqartirilgan):",
        raw.slice(0, 4000),
      ].join("\n");
      continue;
    }

    let merged: WebsiteSchema;
    try {
      merged = applyRegenerationPatch(versionSnapshot, envelope.data.patch);
    } catch (e) {
      repairHint = [
        "Patch qo'llashda xatolik (server merge).",
        e instanceof Error ? e.message : String(e),
        "Model chiqimi (qisqartirilgan):",
        raw.slice(0, 4000),
      ].join("\n");
      continue;
    }

    const validated = websiteSchema.safeParse(preprocessWebsiteJsonCandidate(merged));
    if (validated.success) {
      return { schema: validated.data, attemptsUsed, intent, usedFullSchemaFallback };
    }

    logWebsiteAiPipelineWarn({
      event: "regenerate_merge_zod_failed",
      stage: "zod",
      attempt,
      message: validated.error.message,
    });

    repairHint = [
      "Birlashgan sxema Zod tekshiruvidan o'tmadi. Patchni tuzat yoki to'liq WebsiteSchema qaytar.",
      formatZodIssues(validated.error),
      "ROLLBACK: server bazaviy sxemaga qaytdi; faqat patch bilan qayta urin.",
      "Model chiqimi (qisqartirilgan):",
      raw.slice(0, 4000),
    ].join("\n");
  }

  throw new AiEngineError(
    `AI ${maxRetries} marta urinishdan keyin ham yaroqli natija bermadi (patch yoki to'liq sxema).`,
    "VALIDATION_FAILED",
    repairHint,
  );
}
