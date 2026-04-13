import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let body: { tokenBalance?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const n = typeof body.tokenBalance === "number" ? body.tokenBalance : Number(body.tokenBalance);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
    return NextResponse.json({ ok: false, error: "invalid_balance" }, { status: 400 });
  }
  const balance = Math.floor(n);
  try {
    await prisma.billingAccount.update({
      where: { id },
      data: { tokenBalance: balance },
    });
    return NextResponse.json({ ok: true, tokenBalance: balance });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
