import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { isAdminSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const patchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
  priceMinor: z.number().int().min(0).optional(),
  discountPriceMinor: z.number().int().min(0).nullable().optional(),
  billingPeriodDays: z.number().int().min(1).max(3660).optional(),
  generationLimit: z.number().int().min(0).nullable().optional(),
  exportLimit: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
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
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const actor = getAdminActorLabel();
  try {
    const before = await prisma.managedSubscriptionPlan.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const d = parsed.data;
    const row = await prisma.managedSubscriptionPlan.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.slug !== undefined ? { slug: d.slug } : {}),
        ...(d.priceMinor !== undefined ? { priceMinor: d.priceMinor } : {}),
        ...(d.discountPriceMinor !== undefined ? { discountPriceMinor: d.discountPriceMinor } : {}),
        ...(d.billingPeriodDays !== undefined ? { billingPeriodDays: d.billingPeriodDays } : {}),
        ...(d.generationLimit !== undefined ? { generationLimit: d.generationLimit } : {}),
        ...(d.exportLimit !== undefined ? { exportLimit: d.exportLimit } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      },
    });
    await writeAdminAuditLog({
      action: "MANAGED_PLAN_UPDATED",
      actor,
      payload: { planId: id, before, after: row },
    });
    return NextResponse.json({ ok: true, plan: { id: row.id, slug: row.slug } });
  } catch {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 409 });
  }
}
