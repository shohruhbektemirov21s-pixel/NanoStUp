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
  let body: { siteTokenLimit?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const n = typeof body.siteTokenLimit === "number" ? body.siteTokenLimit : Number(body.siteTokenLimit);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
    return NextResponse.json({ ok: false, error: "invalid_limit" }, { status: 400 });
  }
  const siteTokenLimit = Math.floor(n);
  try {
    await prisma.subscription.update({
      where: { id },
      data: { siteTokenLimit },
    });
    return NextResponse.json({ ok: true, siteTokenLimit });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
