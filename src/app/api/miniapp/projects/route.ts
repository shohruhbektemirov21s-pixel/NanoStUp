import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { readMiniappSessionFromCookies } from "@/lib/telegram/miniapp-session";

export const runtime = "nodejs";

/** Telegram foydalanuvchining saqlangan saytlari (`Site` — preview bilan mos). */
export async function GET(): Promise<NextResponse> {
  const mini = readMiniappSessionFromCookies();
  if (!mini) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: mini.userId },
    select: { telegramId: true, miniappSessionVersion: true },
  });
  if (!user || user.telegramId !== mini.telegramId || user.miniappSessionVersion !== mini.sessionVersion) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sites = await prisma.site.findMany({
    where: { userId: mini.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    projects: sites.map((s) => ({
      id: s.id,
      name: s.title,
      slug: s.slug,
      status: "READY",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}
