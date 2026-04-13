import { NextResponse } from "next/server";

import { approveReceiptVerification } from "@/lib/admin/receipt-approval";
import { isAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let body: { planTier?: unknown; billingMonths?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = await approveReceiptVerification({
    receiptId: id,
    planTier: body.planTier,
    billingMonths: body.billingMonths,
  });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "already_processed" ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
