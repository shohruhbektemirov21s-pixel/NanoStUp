import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AdminAuditPayload = Prisma.InputJsonValue;

export async function writeAdminAuditLog(input: {
  action: string;
  actor: string;
  targetTelegramUserId?: string | null;
  targetWebUserId?: string | null;
  managedSubscriptionId?: string | null;
  payload?: AdminAuditPayload;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      action: input.action.slice(0, 64),
      actor: input.actor.slice(0, 256),
      targetTelegramUserId: input.targetTelegramUserId ?? undefined,
      targetWebUserId: input.targetWebUserId ?? undefined,
      managedSubscriptionId: input.managedSubscriptionId ?? undefined,
      payload: input.payload ?? undefined,
    },
  });
}
