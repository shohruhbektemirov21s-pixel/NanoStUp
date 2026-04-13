import "server-only";

import { ZodError } from "zod";

import {
  postChatCompletion,
  resolveAiClientConfig,
  type ChatMessage,
  type ResolvedAiClientConfig,
} from "@/lib/ai/chat-handler";
import { AiEngineError } from "@/lib/ai/errors";
import { buildFallbackWebsiteSchema } from "@/lib/ai/pipeline/fallback-schema";
import { parseModelJsonWithRecovery } from "@/lib/ai/pipeline/json-recovery";
import {
  logWebsiteAiPipelineError,
  logWebsiteAiPipelineInfo,
  logWebsiteAiPipelineWarn,
} from "@/lib/ai/pipeline/pipeline-logger";
import { sanitizeWebsiteUserPrompt } from "@/lib/ai/pipeline/prompt-sanitize";
import { preprocessWebsiteJsonCandidate } from "@/lib/ai/pipeline/schema-preprocess";
import { withTransientHttpRetry } from "@/lib/ai/pipeline/transient-retry";
import { buildWebsiteSchemaMessages } from "@/lib/ai/prompts";
import type {
  GenerateWebsiteSchemaInput,
  GenerateWebsiteSchemaOutput,
} from "@/lib/ai/website-generation.types";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { collectNavigationIntegrityWarnings } from "@/lib/schema/navigation-integrity";

const TRANSIENT_HTTP_MAX_ATTEMPTS = 3;
const TRANSIENT_HTTP_BASE_DELAY_MS = 450;

function formatZodIssues(error: ZodError): string {
  return JSON.stringify(error.flatten(), null, 2);
}

async function fetchModelJson(input: {
  config: ResolvedAiClientConfig;
  messages: ChatMessage[];
  temperature: number;
  signal?: AbortSignal;
}): Promise<string> {
  return withTransientHttpRetry(
    () =>
      postChatCompletion({
        config: input.config,
        messages: input.messages,
        temperature: input.temperature,
        jsonMode: true,
        signal: input.signal,
      }),
    {
      operationLabel: "postChatCompletion",
      maxAttempts: TRANSIENT_HTTP_MAX_ATTEMPTS,
      baseDelayMs: TRANSIENT_HTTP_BASE_DELAY_MS,
    },
  );
}

/**
 * WebsiteSchema generatsiyasi: sanitizatsiya → LLM (JSON MIME) → JSON tiklash → preprocess → Zod → repair loop → zaxira shablon.
 */
export async function runWebsiteSchemaGenerationPipeline(
  input: GenerateWebsiteSchemaInput,
): Promise<GenerateWebsiteSchemaOutput> {
  /** LLM qayta chaqiruvlari (Zod/JSON tuzatish) — production: 2–3 yetarli */
  const maxRetries = Math.min(3, Math.max(1, input.maxRetries ?? 3));
  if (maxRetries < 1) {
    throw new AiEngineError("maxRetries kamida 1 bo'lishi kerak", "VALIDATION_FAILED");
  }

  const sanitized = sanitizeWebsiteUserPrompt(input.userPrompt);
  const userPrompt = sanitized.text;

  logWebsiteAiPipelineInfo({
    event: "generation_start",
    stage: "sanitize",
    promptLength: userPrompt.length,
    provider: process.env.AI_PROVIDER?.trim().toLowerCase(),
  });

  if (sanitized.removedControlChars > 0 || sanitized.truncated) {
    logWebsiteAiPipelineWarn({
      event: "prompt_sanitized",
      stage: "sanitize",
      message: `removedControlChars=${sanitized.removedControlChars}, truncated=${sanitized.truncated}`,
    });
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

  let repairHint: string | undefined;
  let attemptsUsed = 0;
  const aggregateRecoveries = new Set<string>();
  let lastZodIssueCount = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    attemptsUsed = attempt;
    const messages = buildWebsiteSchemaMessages({
      userPrompt,
      repairHint,
      promptSource: input.promptSource,
      contentLocale: input.contentLocale,
      conversationContext: input.conversationContext,
      planTier: input.planTier,
      templateKind: input.templateKind,
    });

    let raw: string;
    try {
      raw = await fetchModelJson({
        config,
        messages,
        temperature: input.temperature ?? 0.35,
        signal: input.signal,
      });
    } catch (error) {
      logWebsiteAiPipelineError({
        event: "llm_request_failed",
        stage: "llm",
        attempt,
        maxAttempts: maxRetries,
        provider: config.provider,
        httpStatus: error instanceof AiEngineError ? error.httpStatus : undefined,
        message: error instanceof Error ? error.message : "unknown",
      });
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
      for (const r of recovered.recoveries) {
        aggregateRecoveries.add(r);
      }
      logWebsiteAiPipelineWarn({
        event: "json_parse_failed",
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

    for (const r of recovered.recoveries) {
      aggregateRecoveries.add(r);
    }
    if (recovered.recoveries.length > 0) {
      logWebsiteAiPipelineInfo({
        event: "json_recovered",
        stage: "json_parse",
        attempt,
        recoveries: recovered.recoveries,
      });
    }

    const preprocessed = preprocessWebsiteJsonCandidate(recovered.value);
    const validated = websiteSchema.safeParse(preprocessed);
    if (validated.success) {
      const warnings: string[] = [];
      for (const w of collectNavigationIntegrityWarnings(validated.data)) {
        warnings.push(`nav:${w}`);
      }
      if (aggregateRecoveries.size > 0) {
        warnings.push(`json_recoveries:${Array.from(aggregateRecoveries).join(",")}`);
      }
      if (sanitized.removedControlChars > 0) {
        warnings.push(`sanitized_control_chars:${sanitized.removedControlChars}`);
      }
      if (sanitized.truncated) {
        warnings.push("sanitized_truncated_to_max");
      }
      logWebsiteAiPipelineInfo({
        event: "generation_success",
        stage: "zod",
        attempt,
        zodIssueCount: 0,
        provider: config.provider,
      });
      return {
        schema: validated.data,
        attemptsUsed,
        usedFallback: false,
        warnings,
        pipeline: {
          recoveries: aggregateRecoveries.size > 0 ? Array.from(aggregateRecoveries) : undefined,
          sanitization: {
            removedControlChars: sanitized.removedControlChars,
            truncated: sanitized.truncated,
          },
        },
      };
    }

    lastZodIssueCount = validated.error.issues.length;
    logWebsiteAiPipelineWarn({
      event: "zod_validation_failed",
      stage: "zod",
      attempt,
      zodIssueCount: lastZodIssueCount,
      provider: config.provider,
    });

    repairHint = [
      "Zod validatsiyasi o'tmadi. Quyidagi xatolarni tuzat va FAQAT to'g'ri JSON qaytar:",
      formatZodIssues(validated.error),
      "Model chiqimi (qisqartirilgan):",
      raw.slice(0, 4000),
    ].join("\n");
  }

  logWebsiteAiPipelineWarn({
    event: "generation_fallback",
    stage: "fallback",
    maxAttempts: maxRetries,
    zodIssueCount: lastZodIssueCount,
    provider: config.provider,
  });

  const fallbackSchema = buildFallbackWebsiteSchema({
    userPrompt,
    contentLocale: input.contentLocale,
    planTier: input.planTier,
  });

  const warnings: string[] = [
    "used_template_fallback",
    `prior_attempts:${maxRetries}`,
    `last_zod_issues:${lastZodIssueCount}`,
  ];
  if (aggregateRecoveries.size > 0) {
    warnings.push(`json_recoveries:${Array.from(aggregateRecoveries).join(",")}`);
  }
  if (sanitized.removedControlChars > 0) {
    warnings.push(`sanitized_control_chars:${sanitized.removedControlChars}`);
  }
  if (sanitized.truncated) {
    warnings.push("sanitized_truncated_to_max");
  }

  return {
    schema: fallbackSchema,
    attemptsUsed: maxRetries,
    usedFallback: true,
    warnings,
    pipeline: {
      recoveries: aggregateRecoveries.size > 0 ? Array.from(aggregateRecoveries) : undefined,
      sanitization: {
        removedControlChars: sanitized.removedControlChars,
        truncated: sanitized.truncated,
      },
    },
  };
}
