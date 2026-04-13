import { NextResponse } from "next/server";

import { rejectReceiptVerification } from "@/lib/admin/receipt-approval";
import { isAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let reason: string | undefined;
  try {
    const b = (await request.json()) as { reason?: string };
    reason = b.reason;
  } catch {
    reason = undefined;
  }

  const result = await rejectReceiptVerification({ receiptId: id, reason });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "already_processed" ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
