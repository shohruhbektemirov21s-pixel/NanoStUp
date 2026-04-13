import { NextResponse } from "next/server";
import { SubscriptionAcquisitionChannel } from "@prisma/client";
import { z } from "zod";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { grantManagedSubscription } from "@/lib/admin/grant-managed-subscription";
import { isAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    planSlug: z.string().min(1),
    targetKind: z.enum(["telegram", "web"]),
    telegramUserId: z.string().min(1).optional(),
    webUserId: z.string().min(1).optional(),
    billingAccountId: z.string().min(1).optional(),
    source: z.enum(["PURCHASED", "MANUAL"]),
    priceAppliedMinor: z.number().int().min(0).nullable().optional(),
    durationDays: z.number().int().min(1).max(3650).nullable().optional(),
    durationMonths: z.number().int().min(1).max(120).nullable().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    adminNote: z.string().max(4000).optional(),
    acquisitionChannel: z.nativeEnum(SubscriptionAcquisitionChannel).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.targetKind === "telegram" && !val.telegramUserId?.trim()) {
      ctx.addIssue({ code: "custom", message: "telegramUserId required", path: ["telegramUserId"] });
    }
    if (val.targetKind === "web" && !val.webUserId?.trim()) {
      ctx.addIssue({ code: "custom", message: "webUserId required", path: ["webUserId"] });
    }
  });

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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const startsAt = b.startsAt ? new Date(b.startsAt) : new Date();
  let endsAt: Date | null = b.endsAt === undefined ? null : b.endsAt ? new Date(b.endsAt) : null;
  let durationDays = b.durationDays ?? null;
  if (!endsAt) {
    if (b.durationMonths != null) {
      durationDays = b.durationMonths * 30;
    }
    if (durationDays != null) {
      endsAt = new Date(startsAt.getTime() + durationDays * 86_400_000);
    }
  } else if (!durationDays && startsAt && endsAt) {
    durationDays = Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / 86_400_000));
  }

  const actor = getAdminActorLabel();
  try {
    const sub = await grantManagedSubscription({
      actor,
      planSlug: b.planSlug.trim(),
      telegramUserId: b.targetKind === "telegram" ? b.telegramUserId?.trim() : undefined,
      webUserId: b.targetKind === "web" ? b.webUserId?.trim() : undefined,
      billingAccountId: b.billingAccountId?.trim(),
      source: b.source,
      priceAppliedMinor: b.priceAppliedMinor ?? undefined,
      durationDays: durationDays ?? undefined,
      startsAt,
      endsAt,
      adminNote: b.adminNote,
      acquisitionChannel: b.acquisitionChannel ?? undefined,
    });
    return NextResponse.json({
      ok: true,
      subscription: {
        id: sub.id,
        planSlug: sub.planSlug,
        startsAt: sub.startsAt.toISOString(),
        endsAt: sub.endsAt ? sub.endsAt.toISOString() : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "exactly_one_target") {
      return NextResponse.json({ ok: false, error: "bad_target" }, { status: 400 });
    }
    if (msg === "plan_not_found") {
      return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 404 });
    }
    console.error("[admin/managed-subscriptions POST]", e);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
