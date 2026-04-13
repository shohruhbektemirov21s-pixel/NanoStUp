import { getTranslations } from "next-intl/server";

import type { AdminAuditLogClientRow, AdminPlatformStatsClient, ManagedPlanClientRow } from "@/lib/admin/admin-dto";
import { ensureDefaultManagedPlans } from "@/lib/admin/default-managed-plans";
import { getAdminPlatformStats } from "@/lib/admin/platform-stats";
import { prisma } from "@/lib/prisma";
import { getUnifiedUsersForAdmin } from "@/lib/admin/unified-users";

import {
  AdminDashboardClient,
  type AdminBillingClientRow,
  type AdminReceiptClientRow,
  type AdminStats,
  type AdminUserClientRow,
} from "./admin-dashboard-client";
import { AdminLogoutButton } from "./admin-logout-button";

type Props = { locale: string };

export async function AdminDashboard({ locale }: Readonly<Props>) {
  await getTranslations({ locale, namespace: "Admin" });

  let stats: AdminStats = { revenueTiyin: 0, pendingReceipts: 0, activeSubscriptions: 0 };
  let receipts: AdminReceiptClientRow[] = [];
  let usersPayload: AdminUserClientRow[] = [];
  let billingAccounts: AdminBillingClientRow[] = [];
  let sitesFlat: { id: string; title: string; slug: string; telegramId: string }[] = [];

  let platformStats: AdminPlatformStatsClient | null = null;
  let unifiedUsersPayload: Awaited<ReturnType<typeof getUnifiedUsersForAdmin>> = [];
  let managedPlansPayload: ManagedPlanClientRow[] = [];
  let auditLogsPayload: AdminAuditLogClientRow[] = [];

  try {
    const [agg, pendingCount, activeSubs, userRows, receiptRows, billingRows] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where: { status: "completed" },
        _sum: { amount: true },
      }),
      prisma.receiptVerification.count({ where: { approvalStatus: "pending" } }),
      prisma.subscription.count({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      prisma.user.findMany({
        include: { sites: true, subscriptions: true },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      prisma.receiptVerification.findMany({
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      prisma.billingAccount.findMany({
        orderBy: { updatedAt: "desc" },
        take: 80,
        select: {
          id: true,
          tokenBalance: true,
          planTier: true,
          notifyTelegramId: true,
          subscriptionUntil: true,
        },
      }),
    ]);

    stats = {
      revenueTiyin: agg._sum.amount ?? 0,
      pendingReceipts: pendingCount,
      activeSubscriptions: activeSubs,
    };

    receipts = receiptRows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      suspiciousEdit: r.suspiciousEdit,
      exifSoftware: r.exifSoftware,
      hasExpectedPhone: r.hasExpectedPhone,
      hasExpectedAmount: r.hasExpectedAmount,
      hasPaymentCode: r.hasPaymentCode,
      approvalStatus: r.approvalStatus,
      originalFileName: r.originalFileName,
      billingAccountId: r.billingAccountId,
      ocrWarnings: r.ocrWarnings,
    }));

    usersPayload = userRows.map((u) => ({
      id: u.id,
      telegramId: u.telegramId,
      firstName: u.firstName,
      username: u.username,
      sitesCount: u.sites.length,
      subscriptions: u.subscriptions.map((s) => ({
        id: s.id,
        plan: s.plan,
        siteTokenLimit: s.siteTokenLimit,
        expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
      })),
    }));

    sitesFlat = userRows.flatMap((u) =>
      u.sites.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        telegramId: u.telegramId,
      })),
    );

    billingAccounts = billingRows.map((b) => ({
      id: b.id,
      tokenBalance: b.tokenBalance,
      planTier: b.planTier,
      notifyTelegramId: b.notifyTelegramId,
      subscriptionUntil: b.subscriptionUntil ? b.subscriptionUntil.toISOString() : null,
    }));
  } catch {
    /* DB yo‘q yoki migratsiya — bo‘sh holat */
  }

  try {
    await ensureDefaultManagedPlans();
    const [pStats, uRows, planRows, auditRows] = await Promise.all([
      getAdminPlatformStats(),
      getUnifiedUsersForAdmin(200),
      prisma.managedSubscriptionPlan.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
    ]);
    platformStats = pStats;
    unifiedUsersPayload = uRows;
    managedPlansPayload = planRows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceMinor: p.priceMinor,
      discountPriceMinor: p.discountPriceMinor,
      billingPeriodDays: p.billingPeriodDays,
      generationLimit: p.generationLimit,
      exportLimit: p.exportLimit,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
    auditLogsPayload = auditRows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actor,
      targetTelegramUserId: r.targetTelegramUserId,
      targetWebUserId: r.targetWebUserId,
      managedSubscriptionId: r.managedSubscriptionId,
      payload: r.payload,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (e) {
    console.warn("[AdminDashboard] subscription/admin tables unavailable:", e);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex justify-end">
        <AdminLogoutButton />
      </div>
      <AdminDashboardClient
        stats={stats}
        receipts={receipts}
        users={usersPayload}
        billingAccounts={billingAccounts}
        sites={sitesFlat}
        platformStats={platformStats}
        unifiedUsers={unifiedUsersPayload}
        managedPlans={managedPlansPayload}
        auditLogs={auditLogsPayload}
      />
    </div>
  );
}
