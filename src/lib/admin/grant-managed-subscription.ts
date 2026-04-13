import "server-only";

import type { AdminManagedSubSource, SubscriptionAcquisitionChannel } from "@prisma/client";

import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { prisma } from "@/lib/prisma";

export type GrantManagedSubscriptionInput = {
  actor: string;
  planSlug: string;
  telegramUserId?: string | null;
  webUserId?: string | null;
  billingAccountId?: string | null;
  source: AdminManagedSubSource;
  priceAppliedMinor?: number | null;
  durationDays?: number | null;
  startsAt: Date;
  endsAt: Date | null;
  adminNote?: string | null;
  acquisitionChannel?: SubscriptionAcquisitionChannel | null;
};

export async function grantManagedSubscription(input: GrantManagedSubscriptionInput) {
  const hasTg = Boolean(input.telegramUserId?.trim());
  const hasWeb = Boolean(input.webUserId?.trim());
  if (hasTg === hasWeb) {
    throw new Error("exactly_one_target");
  }

  const plan = await prisma.managedSubscriptionPlan.findFirst({
    where: {
      isActive: true,
      OR: [{ slug: input.planSlug }, { id: input.planSlug }],
    },
  });
  if (!plan) {
    throw new Error("plan_not_found");
  }

  const now = new Date();
  await prisma.managedSubscription.updateMany({
    where: {
      status: "ACTIVE",
      ...(hasTg
        ? { telegramUserId: input.telegramUserId! }
        : { webUserId: input.webUserId! }),
    },
    data: { status: "CANCELLED", updatedAt: now },
  });

  const sub = await prisma.managedSubscription.create({
    data: {
      telegramUserId: input.telegramUserId?.trim() || undefined,
      webUserId: input.webUserId?.trim() || undefined,
      billingAccountId: input.billingAccountId?.trim() || undefined,
      planSlug: plan.slug,
      planName: plan.name,
      status: "ACTIVE",
      source: input.source,
      acquisitionChannel: input.acquisitionChannel ?? undefined,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      priceAppliedMinor: input.priceAppliedMinor ?? undefined,
      durationDays: input.durationDays ?? undefined,
      adminNote: input.adminNote?.trim() || undefined,
      grantedByActor: input.actor.slice(0, 256),
    },
  });

  await writeAdminAuditLog({
    action: "MANAGED_SUBSCRIPTION_GRANTED",
    actor: input.actor,
    targetTelegramUserId: input.telegramUserId?.trim() || undefined,
    targetWebUserId: input.webUserId?.trim() || undefined,
    managedSubscriptionId: sub.id,
    payload: {
      planSlug: plan.slug,
      planName: plan.name,
      source: input.source,
      priceAppliedMinor: input.priceAppliedMinor ?? null,
      durationDays: input.durationDays ?? null,
      startsAt: input.startsAt.toISOString(),
      endsAt: input.endsAt ? input.endsAt.toISOString() : null,
      note: input.adminNote?.trim() ?? null,
      acquisitionChannel: input.acquisitionChannel ?? null,
    },
  });

  return sub;
}
