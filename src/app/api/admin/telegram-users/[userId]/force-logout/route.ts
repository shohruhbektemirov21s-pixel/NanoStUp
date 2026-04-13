import { NextResponse } from "next/server";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { isAdminSession } from "@/lib/admin/session";
import { incrementUserMiniappSessionVersion } from "@/features/telegram-bot/services/user.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ userId: string }> };

/**
 * Clears Grammy session rows that reference the Telegram numeric id in the session key.
 */
export async function POST(_request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { userId } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, telegramId: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const tid = user.telegramId;
  const deleted = await prisma.telegramSession.deleteMany({
    where: {
      OR: [{ key: tid }, { key: { startsWith: `${tid}:` } }, { key: { endsWith: `:${tid}` } }],
    },
  });
  await incrementUserMiniappSessionVersion(user.id);
  const actor = getAdminActorLabel();
  await writeAdminAuditLog({
    action: "TELEGRAM_USER_FORCE_LOGOUT",
    actor,
    targetTelegramUserId: user.id,
    payload: { sessionsRemoved: deleted.count, telegramId: tid },
  });
  return NextResponse.json({ ok: true, sessionsRemoved: deleted.count });
}
