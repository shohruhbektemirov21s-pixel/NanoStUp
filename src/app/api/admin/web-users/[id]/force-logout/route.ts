import { NextResponse } from "next/server";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { isAdminSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/** Invalidates builder sessions that check `sessionVersion` on the WebUser row. */
export async function POST(_request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const actor = getAdminActorLabel();
  try {
    const row = await prisma.webUser.update({
      where: { id },
      data: { sessionVersion: { increment: 1 } },
    });
    await writeAdminAuditLog({
      action: "WEB_USER_FORCE_LOGOUT",
      actor,
      targetWebUserId: id,
      payload: { sessionVersion: row.sessionVersion },
    });
    return NextResponse.json({ ok: true, sessionVersion: row.sessionVersion });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
