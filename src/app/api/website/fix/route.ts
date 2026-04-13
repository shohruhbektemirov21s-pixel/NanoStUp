import { NextResponse } from "next/server";

import { getApiGenerateMessages, resolveContentLocale } from "@/lib/api-generate-messages";
import { AiEngineError } from "@/lib/ai/errors";
import {
  formatEditScopeForPrompt,
  formatFeedbackIntentForPrompt,
  inferWebsiteEditScope,
  parseFeedbackIntent,
} from "@/lib/ai/feedback-intent";
import { fixWebsiteSchemaFromUserReport } from "@/lib/ai/fix-website-schema";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { assertWebsiteAiRequest, resolveSchemaPlanTierForRequest } from "@/lib/builder/ai-route-guard";
import { routing } from "@/i18n/routing";
import { websiteFixBodySchema } from "@/lib/website-fix-body.zod";
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
  const copyDraft = getApiGenerateMessages(draftLocale);

  const parsedBody = websiteFixBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const tooLong = parsedBody.error.issues.some(
      (i) => i.code === "too_big" && i.path.length > 0 && i.path[0] === "issue",
    );
    if (tooLong) {
      return NextResponse.json(
        { error: copyDraft.promptTooLong.replace("{max}", String(WEBSITE_PROMPT_MAX_CHARS)) },
        { status: 400 },
      );
    }
    const emptyIssue = parsedBody.error.issues.some((i) => i.message === "empty_issue");
    if (emptyIssue) {
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

  const { issue, locale: bodyLocale } = parsedBody.data;
  const contentLocale = resolveContentLocale(bodyLocale);
  const copy = getApiGenerateMessages(contentLocale);
  const planTier = await resolveSchemaPlanTierForRequest();

  const scope = inferWebsiteEditScope(issue);
  const intent = parseFeedbackIntent(issue);
  const augmentedIssue = [
    "EDIT_SCOPE_JSON:",
    formatEditScopeForPrompt(scope),
    "",
    "FEEDBACK_INTENT_JSON:",
    formatFeedbackIntentForPrompt(intent),
    "",
    "RULES: Return the FULL WebsiteSchema JSON. Change only what the feedback requires; preserve page/section ids and slugs unless the user explicitly asks to rename/remove/add routes. Keep navigation hrefs consistent with existing page slugs.",
    "",
    "USER_FEEDBACK:",
    issue,
  ].join("\n");

  try {
    const { schema, attemptsUsed } = await fixWebsiteSchemaFromUserReport({
      schema: schemaParsed.data,
      userIssue: augmentedIssue,
      contentLocale,
      planTier,
    });
    return NextResponse.json({ schema, attemptsUsed });
  } catch (error) {
    if (error instanceof AiEngineError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    return NextResponse.json({ error: copy.unexpected }, { status: 500 });
  }
}
