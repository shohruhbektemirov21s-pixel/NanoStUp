import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { ensureDefaultManagedPlans } from "@/lib/admin/default-managed-plans";
import { isAdminSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createBody = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  priceMinor: z.number().int().min(0),
  discountPriceMinor: z.number().int().min(0).nullable().optional(),
  billingPeriodDays: z.number().int().min(1).max(3660).default(30),
  generationLimit: z.number().int().min(0).nullable().optional(),
  exportLimit: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    await ensureDefaultManagedPlans();
    const plans = await prisma.managedSubscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      ok: true,
      plans: plans.map((p) => ({
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
      })),
    });
  } catch (e) {
    console.error("[admin/managed-plans GET]", e);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const actor = getAdminActorLabel();
  try {
    const row = await prisma.managedSubscriptionPlan.create({
      data: {
        slug: b.slug,
        name: b.name,
        priceMinor: b.priceMinor,
        discountPriceMinor: b.discountPriceMinor ?? undefined,
        billingPeriodDays: b.billingPeriodDays,
        generationLimit: b.generationLimit ?? undefined,
        exportLimit: b.exportLimit ?? undefined,
        isActive: b.isActive ?? true,
        sortOrder: b.sortOrder ?? 0,
      },
    });
    await writeAdminAuditLog({
      action: "MANAGED_PLAN_CREATED",
      actor,
      payload: { planId: row.id, slug: row.slug },
    });
    return NextResponse.json({ ok: true, plan: { id: row.id, slug: row.slug } });
  } catch {
    return NextResponse.json({ ok: false, error: "duplicate_or_db" }, { status: 409 });
  }
}
