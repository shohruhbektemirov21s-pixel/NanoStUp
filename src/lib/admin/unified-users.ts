import "server-only";

import type { UnifiedUserAdminRow } from "@/lib/admin/admin-dto";
import { prisma } from "@/lib/prisma";

export type { UnifiedUserAdminRow } from "@/lib/admin/admin-dto";

function fullName(parts: (string | null | undefined)[]): string {
  const s = parts.filter(Boolean).join(" ").trim();
  return s || "—";
}

function managedIsCurrent(endsAt: Date | null, status: string): boolean {
  if (status !== "ACTIVE") {
    return false;
  }
  return endsAt == null || endsAt > new Date();
}

export async function getUnifiedUsersForAdmin(take = 200): Promise<UnifiedUserAdminRow[]> {
  const exportRows = await prisma.$queryRaw<{ owner_user_id: string; c: bigint }[]>`
    SELECT p."owner_user_id" AS owner_user_id, COUNT(e.id)::bigint AS c
    FROM "export_artifacts" e
    INNER JOIN "website_projects" p ON p.id = e."project_id"
    WHERE p."owner_user_id" IS NOT NULL
    GROUP BY p."owner_user_id"
  `;
  const exportByOwner = new Map<string, number>();
  for (const r of exportRows) {
    exportByOwner.set(r.owner_user_id, Number(r.c));
  }

  const telegramUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      sites: { select: { id: true } },
      ownedWebsiteProjects: { select: { id: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 3 },
      managedSubscriptions: { orderBy: { createdAt: "desc" }, take: 8 },
      linkedWebAccount: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          managedSubscriptions: { orderBy: { createdAt: "desc" }, take: 8 },
        },
      },
    },
  });

  const rows: UnifiedUserAdminRow[] = [];

  for (const u of telegramUsers) {
    const link = u.linkedWebAccount;
    const allManaged = [...u.managedSubscriptions, ...(link?.managedSubscriptions ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const currentManaged = allManaged.find((m) => managedIsCurrent(m.endsAt, m.status));

    const sitesCount = u.sites.length + u.ownedWebsiteProjects.length;
    const exportsCount = exportByOwner.get(u.id) ?? 0;

    const legacy = u.subscriptions[0];
    const source: UnifiedUserAdminRow["source"] = link ? "both" : "telegram";

    rows.push({
      rowKey: `tg:${u.id}`,
      kind: "telegram",
      telegramUserId: u.id,
      webUserId: link?.id ?? null,
      fullName: fullName([link?.firstName, link?.lastName, u.firstName, u.lastName]),
      emailOrPhone: link?.email ?? link?.phone ?? u.username ?? u.telegramId,
      role: link?.role ?? "telegram",
      registeredAt: (link?.createdAt ?? u.createdAt).toISOString(),
      lastLoginAt: link?.lastLoginAt ? link.lastLoginAt.toISOString() : null,
      source,
      sitesCount,
      exportsCount,
      managedPlanSlug: currentManaged?.planSlug ?? null,
      managedPlanName: currentManaged?.planName ?? null,
      managedStatus: currentManaged?.status ?? null,
      managedStartsAt: currentManaged?.startsAt.toISOString() ?? null,
      managedEndsAt: currentManaged?.endsAt ? currentManaged.endsAt.toISOString() : null,
      managedSource: currentManaged?.source ?? null,
      legacyPlanLabel: legacy ? `${legacy.plan}${legacy.expiresAt ? ` · ${legacy.expiresAt.toISOString().slice(0, 10)}` : ""}` : null,
      isActive: link ? link.isActive : true,
    });
  }

  const linkedIds = new Set(
    telegramUsers.map((u) => u.linkedWebAccount?.id).filter((x): x is string => Boolean(x)),
  );

  const webOnlyWhere: { id?: { notIn: string[] } } = {};
  if (linkedIds.size > 0) {
    webOnlyWhere.id = { notIn: Array.from(linkedIds) };
  }

  const webOnly = await prisma.webUser.findMany({
    where: webOnlyWhere,
    orderBy: { createdAt: "desc" },
    take: Math.max(0, take - rows.length),
    include: {
      managedSubscriptions: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  for (const w of webOnly) {
    const currentManaged = w.managedSubscriptions.find((m) => managedIsCurrent(m.endsAt, m.status));
    rows.push({
      rowKey: `web:${w.id}`,
      kind: "web_only",
      telegramUserId: null,
      webUserId: w.id,
      fullName: fullName([w.firstName, w.lastName]),
      emailOrPhone: w.email ?? w.phone ?? "—",
      role: w.role,
      registeredAt: w.createdAt.toISOString(),
      lastLoginAt: w.lastLoginAt ? w.lastLoginAt.toISOString() : null,
      source: "website",
      sitesCount: 0,
      exportsCount: 0,
      managedPlanSlug: currentManaged?.planSlug ?? null,
      managedPlanName: currentManaged?.planName ?? null,
      managedStatus: currentManaged?.status ?? null,
      managedStartsAt: currentManaged?.startsAt.toISOString() ?? null,
      managedEndsAt: currentManaged?.endsAt ? currentManaged.endsAt.toISOString() : null,
      managedSource: currentManaged?.source ?? null,
      legacyPlanLabel: null,
      isActive: w.isActive,
    });
  }

  return rows;
}
