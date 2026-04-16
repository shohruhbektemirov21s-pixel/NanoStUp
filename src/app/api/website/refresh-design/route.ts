import { NextResponse } from "next/server";

import { getApiGenerateMessages, resolveContentLocale } from "@/lib/api-generate-messages";
import { nextResponseFromAiEngineError } from "@/lib/api/map-ai-engine-error-response";
import { AiEngineError } from "@/lib/ai/errors";
import { regenerateWebsiteTheme } from "@/lib/ai/regenerate-website-theme";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { routing } from "@/i18n/routing";
import { assertWebsiteAiGenerationThrottle, assertWebsiteAiRequest } from "@/lib/builder/ai-route-guard";
import { websiteRefreshSchemaBodySchema } from "@/lib/website-refresh-schema-body.zod";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const copy = getApiGenerateMessages(routing.defaultLocale);
    return NextResponse.json({ error: copy.invalidJson }, { status: 400 });
  }

  const parsedBody = websiteRefreshSchemaBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const copy = getApiGenerateMessages(routing.defaultLocale);
    return NextResponse.json({ error: copy.invalidPayload }, { status: 400 });
  }

  const draftLocale = resolveContentLocale(parsedBody.data.locale);
  const denied = await assertWebsiteAiRequest(request, draftLocale);
  if (denied) {
    return denied;
  }
  const genThrottle = await assertWebsiteAiGenerationThrottle(request, draftLocale);
  if (genThrottle) {
    return genThrottle;
  }
  const copy = getApiGenerateMessages(draftLocale);

  const schemaParsed = websiteSchema.safeParse(parsedBody.data.schema);
  if (!schemaParsed.success) {
    return NextResponse.json(
      { error: copy.schemaValidation, details: schemaParsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const schema = await regenerateWebsiteTheme({ schema: schemaParsed.data });
    const again = websiteSchema.safeParse(schema);
    if (!again.success) {
      return NextResponse.json(
        { error: copy.schemaValidation, details: again.error.flatten() },
        { status: 500 },
      );
    }
    return NextResponse.json({ schema: again.data });
  } catch (error) {
    if (error instanceof AiEngineError) {
      return nextResponseFromAiEngineError(error, copy);
    }
    return NextResponse.json({ error: copy.unexpected }, { status: 500 });
  }
}
