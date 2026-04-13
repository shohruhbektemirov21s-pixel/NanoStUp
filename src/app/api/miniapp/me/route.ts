import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { readMiniappSessionFromCookies } from "@/lib/telegram/miniapp-session";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const mini = readMiniappSessionFromCookies();
  if (!mini) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: mini.userId },
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      lastName: true,
      telegramPhotoUrl: true,
      authSource: true,
      miniAppLastOpenedAt: true,
      telegramLinkedAt: true,
      miniappSessionVersion: true,
      linkedWebAccount: { select: { id: true, email: true } },
    },
  });

  if (!user || user.telegramId !== mini.telegramId || user.miniappSessionVersion !== mini.sessionVersion) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const managed = await prisma.managedSubscription.findFirst({
    where: {
      telegramUserId: user.id,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      planName: true,
      planSlug: true,
      source: true,
      acquisitionChannel: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const legacy = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { plan: true, expiresAt: true },
  });

  const siteCount = await prisma.site.count({ where: { userId: user.id } });
  const saasProjectCount = await prisma.websiteProject.count({
    where: { ownerUserId: user.id, deletedAt: null },
  });

  return NextResponse.json({
    ok: true,
    profile: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.telegramPhotoUrl,
      authSource: user.authSource,
      miniAppLastOpenedAt: user.miniAppLastOpenedAt?.toISOString() ?? null,
      linkedWeb: user.linkedWebAccount,
      siteCount,
      saasProjectCount,
      subscription: managed
        ? {
            kind: "managed" as const,
            planName: managed.planName,
            planSlug: managed.planSlug,
            source: managed.source,
            acquisitionChannel: managed.acquisitionChannel,
            startsAt: managed.startsAt.toISOString(),
            endsAt: managed.endsAt ? managed.endsAt.toISOString() : null,
          }
        : legacy
          ? {
              kind: "legacy" as const,
              plan: legacy.plan,
              expiresAt: legacy.expiresAt ? legacy.expiresAt.toISOString() : null,
            }
          : null,
    },
  });
}
