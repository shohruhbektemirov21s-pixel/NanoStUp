import { NextResponse } from "next/server";

import { AiEngineError } from "@/lib/ai/errors";
import type { ApiGenerateMessages } from "@/lib/api-generate-messages";

/**
 * Foydalanuvchiga xavfsiz matn (xom JSON / provider dump yo‘q).
 */
export function nextResponseFromAiEngineError(error: AiEngineError, copy: ApiGenerateMessages): NextResponse {
  const status = error.httpStatus;
  const msg = error.message ?? "";

  if (status === 429) {
    return NextResponse.json({ error: copy.providerBusy, code: "PROVIDER_QUOTA" }, { status: 502 });
  }

  if (/quota|RESOURCE_EXHAUSTED|rate limit exceeded|too many requests/i.test(msg)) {
    return NextResponse.json({ error: copy.providerBusy, code: "PROVIDER_QUOTA" }, { status: 502 });
  }

  if (/generativelanguage\.googleapis|googleapis\.com\/v1|Gemini xatosi \(HTTP/i.test(msg)) {
    return NextResponse.json({ error: copy.aiTemporarilyUnavailable, code: error.code }, { status: 502 });
  }

  if (error.code === "MISSING_API_KEY" || error.code === "MISSING_PROVIDER") {
    return NextResponse.json({ error: copy.unexpected, code: error.code }, { status: 500 });
  }

  if (error.code === "VALIDATION_FAILED" || error.code === "INVALID_JSON") {
    return NextResponse.json({ error: copy.schemaValidation, code: error.code }, { status: 502 });
  }

  return NextResponse.json({ error: copy.aiTemporarilyUnavailable, code: error.code }, { status: 502 });
}
