import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 100));
  try {
    const rows = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json({
      ok: true,
      logs: rows.map((r) => ({
        id: r.id,
        action: r.action,
        actor: r.actor,
        targetTelegramUserId: r.targetTelegramUserId,
        targetWebUserId: r.targetWebUserId,
        managedSubscriptionId: r.managedSubscriptionId,
        payload: r.payload,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[admin/audit-logs GET]", e);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
