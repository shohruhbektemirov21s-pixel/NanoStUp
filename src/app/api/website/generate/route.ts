import { NextResponse } from "next/server";

import { AiEngineError } from "@/lib/ai/errors";
import { generateWebsiteSchemaFromSpeech } from "@/lib/ai/generate-website-schema";
import { logWebsiteAiPipelineError } from "@/lib/ai/pipeline/pipeline-logger";
import {
  getWebsiteGenerateCached,
  setWebsiteGenerateCached,
  websiteGenerateCacheKey,
} from "@/lib/ai/website-generate-response-cache";
import { getApiGenerateMessages, resolveContentLocale } from "@/lib/api-generate-messages";
import { nextResponseFromAiEngineError } from "@/lib/api/map-ai-engine-error-response";
import {
  assertWebsiteAiGenerationThrottle,
  assertWebsiteAiRequest,
  resolveSchemaPlanTierForRequest,
} from "@/lib/builder/ai-route-guard";
import { routing } from "@/i18n/routing";
import { WEBSITE_PROMPT_MAX_CHARS, websiteGenerateBodySchema } from "@/lib/website-generate-body.zod";
import { websiteGenerateSuccessResponseSchema } from "@/lib/website-generate-response.zod";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const copy = getApiGenerateMessages(routing.defaultLocale);
    return NextResponse.json({ error: copy.invalidJson }, { status: 400 });
  }

  const draftLocale = resolveContentLocale(
    typeof body === "object" && body !== null && "locale" in body ? (body as { locale?: unknown }).locale : undefined,
  );
  const denied = await assertWebsiteAiRequest(request, draftLocale);
  if (denied) {
    return denied;
  }
  const genThrottle = await assertWebsiteAiGenerationThrottle(request, draftLocale);
  if (genThrottle) {
    return genThrottle;
  }
  const copyDraft = getApiGenerateMessages(draftLocale);

  const parsedBody = websiteGenerateBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const contextHuge = parsedBody.error.issues.some((i) => i.message === "context_too_large");
    if (contextHuge) {
      return NextResponse.json({ error: copyDraft.contextTooLarge }, { status: 400 });
    }
    const tooLong = parsedBody.error.issues.some(
      (i) => i.code === "too_big" && i.path.length > 0 && i.path[0] === "prompt",
    );
    if (tooLong) {
      return NextResponse.json(
        { error: copyDraft.promptTooLong.replace("{max}", String(WEBSITE_PROMPT_MAX_CHARS)) },
        { status: 400 },
      );
    }
    const emptyPrompt = parsedBody.error.issues.some((i) => i.message === "empty_prompt");
    if (emptyPrompt) {
      return NextResponse.json({ error: copyDraft.emptyPrompt }, { status: 400 });
    }
    return NextResponse.json({ error: copyDraft.invalidPayload }, { status: 400 });
  }

  const { prompt, locale: bodyLocale, contextTurns } = parsedBody.data;
  const contentLocale = resolveContentLocale(bodyLocale);
  const copy = getApiGenerateMessages(contentLocale);
  const templateKind = parsedBody.data.templateKind ?? "balanced";

  const conversationContext =
    contextTurns && contextTurns.length > 0
      ? contextTurns.map((row) => `${row.role.toUpperCase()}:\n${row.text.trim()}`).join("\n\n---\n\n")
      : undefined;

  const planTier = await resolveSchemaPlanTierForRequest();

  const contextFingerprint =
    contextTurns && contextTurns.length > 0
      ? contextTurns.map((row) => `${row.role}:${row.text.trim()}`).join("\n---\n")
      : "";
  const cacheKey = websiteGenerateCacheKey({
    prompt,
    contentLocale,
    templateKind,
    planTier,
    contextFingerprint,
  });
  const cached = getWebsiteGenerateCached(cacheKey);
  if (cached) {
    const cachedOk = websiteGenerateSuccessResponseSchema.safeParse({
      schema: cached.schema,
      attemptsUsed: cached.attemptsUsed,
      usedFallback: cached.usedFallback,
      warnings: cached.warnings,
      pipeline: cached.pipeline,
    });
    if (cachedOk.success) {
      return NextResponse.json(cachedOk.data);
    }
  }

  try {
    const result = await generateWebsiteSchemaFromSpeech({
      userPrompt: prompt,
      contentLocale,
      conversationContext,
      planTier,
      templateKind,
    });
    setWebsiteGenerateCached(cacheKey, result);
    const okBody = websiteGenerateSuccessResponseSchema.safeParse({
      schema: result.schema,
      attemptsUsed: result.attemptsUsed,
      usedFallback: result.usedFallback,
      warnings: result.warnings,
      pipeline: result.pipeline,
    });
    if (!okBody.success) {
      logWebsiteAiPipelineError({
        event: "api_response_contract_failed",
        message: "websiteGenerateSuccessResponseSchema",
        zodIssueCount: okBody.error.issues.length,
      });
      return NextResponse.json({ error: copy.unexpected }, { status: 500 });
    }
    return NextResponse.json(okBody.data);
  } catch (error) {
    if (error instanceof AiEngineError) {
      return nextResponseFromAiEngineError(error, copy);
    }
    return NextResponse.json({ error: copy.unexpected }, { status: 500 });
  }
}
