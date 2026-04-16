import { NextResponse } from "next/server";
import { z } from "zod";

import { applyBuilderSessionCookie, ensureBillingIdForBuilder } from "@/lib/builder/ensure-billing-account";
import { getBuilderSessionPayload } from "@/lib/builder/builder-session";
import { ensureDefaultManagedPlans } from "@/lib/admin/default-managed-plans";
import { totalUzsWholeFromManagedPlan } from "@/lib/billing/managed-plan-pricing";
import type { PaymePlanTier } from "@/lib/payme/pricing";
import { uzsForPlanMonths } from "@/lib/payme/pricing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["basic", "pro", "premium"]),
  months: z.number().int().min(1).max(24),
});

function notePrefix(): string {
  const p = process.env.RECEIPT_PAYMENT_NOTE_PREFIX?.trim();
  return p && p.length > 0 ? p : "Usta";
}

function ttlMs(): number {
  const h = Number(process.env.RECEIPT_CODE_TTL_HOURS ?? "72");
  const hrs = Number.isFinite(h) && h > 0 ? h : 72;
  return hrs * 60 * 60 * 1000;
}

async function uniqueCode(prefix: string): Promise<string> {
  for (let i = 0; i < 12; i += 1) {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix}-${n}`;
    const clash = await prisma.receiptPaymentCode.findUnique({ where: { code } });
    if (!clash) {
      return code;
    }
  }
  throw new Error("code_generation_failed");
}

export async function POST(request: Request): Promise<NextResponse> {
  const builder = getBuilderSessionPayload();
  if (!builder) {
    return NextResponse.json({ ok: false, error: "builder_auth_required" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { tier, months } = parsed.data;
  const { billingId, newSessionToken } = await ensureBillingIdForBuilder(builder);

  await prisma.receiptPaymentCode.updateMany({
    where: {
      billingAccountId: billingId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date() },
  });

  const prefix = notePrefix();
  const code = await uniqueCode(prefix);
  let expectedAmountUzs: number;
  await ensureDefaultManagedPlans();
  const managedPlan = await prisma.managedSubscriptionPlan.findFirst({
    where: { slug: tier, isActive: true },
  });
  if (managedPlan) {
    expectedAmountUzs = totalUzsWholeFromManagedPlan(managedPlan, months);
  } else {
    try {
      expectedAmountUzs = uzsForPlanMonths(tier as PaymePlanTier, months);
    } catch {
      return NextResponse.json({ ok: false, error: "pricing_not_configured" }, { status: 503 });
    }
  }
  const expiresAt = new Date(Date.now() + ttlMs());

  await prisma.receiptPaymentCode.create({
    data: {
      code,
      billingAccountId: billingId,
      planTier: tier,
      billingMonths: months,
      expectedAmountUzs,
      expiresAt,
    },
  });

  const res = NextResponse.json({
    ok: true as const,
    code,
    expectedAmountUzs,
    tier,
    months,
    expiresAt: expiresAt.toISOString(),
    hint: `To'lov "Izoh" maydoniga quyidagini yozing: ${code}`,
  });

  if (newSessionToken) {
    applyBuilderSessionCookie(res, newSessionToken, request);
  }

  return res;
}
