import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { isAdminSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  isActive: z.boolean(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }
  const actor = getAdminActorLabel();
  try {
    const row = await prisma.webUser.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
    });
    await writeAdminAuditLog({
      action: parsed.data.isActive ? "WEB_USER_REACTIVATED" : "WEB_USER_DEACTIVATED",
      actor,
      targetWebUserId: id,
      payload: { isActive: row.isActive },
    });
    return NextResponse.json({ ok: true, isActive: row.isActive });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
