import { NextResponse } from "next/server";

import { getApiGenerateMessages, resolveContentLocale } from "@/lib/api-generate-messages";
import { nextResponseFromAiEngineError } from "@/lib/api/map-ai-engine-error-response";
import { AiEngineError } from "@/lib/ai/errors";
import { targetedWebsiteRegeneration } from "@/lib/ai/targeted-website-regeneration.service";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import {
  assertWebsiteAiGenerationThrottle,
  assertWebsiteAiRequest,
  resolveSchemaPlanTierForRequest,
} from "@/lib/builder/ai-route-guard";
import { routing } from "@/i18n/routing";
import { websiteRegenerateBodySchema } from "@/lib/website-regenerate-body.zod";
import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";

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

  const parsedBody = websiteRegenerateBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const tooLong = parsedBody.error.issues.some(
      (i) => i.code === "too_big" && i.path.length > 0 && i.path[0] === "feedback",
    );
    if (tooLong) {
      return NextResponse.json(
        { error: copyDraft.promptTooLong.replace("{max}", String(WEBSITE_PROMPT_MAX_CHARS)) },
        { status: 400 },
      );
    }
    const emptyFeedback = parsedBody.error.issues.some((i) => i.message === "empty_feedback");
    if (emptyFeedback) {
      return NextResponse.json({ error: copyDraft.emptyPrompt }, { status: 400 });
    }
    return NextResponse.json({ error: copyDraft.invalidPayload }, { status: 400 });
  }

  const schemaParsed = websiteSchema.safeParse(parsedBody.data.schema);
  if (!schemaParsed.success) {
    return NextResponse.json(
      { error: copyDraft.invalidPayload, details: schemaParsed.error.flatten() },
      { status: 400 },
    );
  }

  const { feedback, locale: bodyLocale } = parsedBody.data;
  const contentLocale = resolveContentLocale(bodyLocale);
  const copy = getApiGenerateMessages(contentLocale);
  const planTier = await resolveSchemaPlanTierForRequest();

  try {
    const { schema, attemptsUsed, intent, usedFullSchemaFallback } = await targetedWebsiteRegeneration({
      schema: schemaParsed.data,
      feedback,
      contentLocale,
      planTier,
    });
    return NextResponse.json({
      schema,
      attemptsUsed,
      intent,
      usedFullSchemaFallback,
    });
  } catch (error) {
    if (error instanceof AiEngineError) {
      return nextResponseFromAiEngineError(error, copy);
    }
    return NextResponse.json({ error: copy.unexpected }, { status: 500 });
  }
}
