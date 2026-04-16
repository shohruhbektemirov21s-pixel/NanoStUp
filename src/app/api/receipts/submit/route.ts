import { NextResponse } from "next/server";

import { applyBuilderSessionCookie, ensureBillingIdForBuilder } from "@/lib/builder/ensure-billing-account";
import { getBuilderSessionPayload } from "@/lib/builder/builder-session";
import { verifyAndStoreReceipt } from "@/lib/receipts/verify-receipt";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request): Promise<NextResponse> {
  const builder = getBuilderSessionPayload();
  if (!builder) {
    return NextResponse.json({ ok: false, error: "builder_auth_required" }, { status: 401 });
  }
  const { billingId, newSessionToken } = await ensureBillingIdForBuilder(builder);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ ok: false, error: "unsupported_mime" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0 || buf.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_size" }, { status: 400 });
  }

  const notifyRaw = form.get("notify_telegram_id");
  const notifyTelegramId = typeof notifyRaw === "string" ? notifyRaw.trim() : "";

  try {
    const result = await verifyAndStoreReceipt({
      billingAccountId: billingId,
      buffer: buf,
      originalName: file.name || "receipt.jpg",
      mimeType: mime,
      notifyTelegramId: notifyTelegramId.length > 0 ? notifyTelegramId : null,
    });
    const res = NextResponse.json({ ok: true, ...result });
    if (newSessionToken) {
      applyBuilderSessionCookie(res, newSessionToken, request);
    }
    return res;
  } catch (e) {
    console.error("[receipts/submit]", e);
    return NextResponse.json({ ok: false, error: "verify_failed" }, { status: 500 });
  }
}
