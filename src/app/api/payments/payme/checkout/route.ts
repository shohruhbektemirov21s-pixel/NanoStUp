import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureDefaultManagedPlans } from "@/lib/admin/default-managed-plans";
import { builderSessionSetCookieOptions } from "@/lib/builder/builder-session-cookie-options";
import { BUILDER_SESSION_COOKIE, createBuilderSessionToken, getBuilderSessionPayload } from "@/lib/builder/builder-session";
import { buildPaymeCheckoutUrl, computeCheckoutAmountTiyinFromManagedPlan } from "@/lib/payme/checkout";
import type { PaymePlanTier } from "@/lib/payme/pricing";
import { readPaymeCredentials } from "@/lib/payme/merchant-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["basic", "pro", "premium"]),
  months: z.number().int().min(1).max(24),
  locale: z.enum(["uz", "ru", "en"]).optional(),
});

function appBaseUrl(): string {
  const u = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!u) {
    return "http://localhost:3000";
  }
  return u.replace(/\/$/, "");
}

export async function POST(request: Request): Promise<NextResponse> {
  const creds = readPaymeCredentials();
  if (!creds) {
    return NextResponse.json({ ok: false, error: "payme_not_configured" }, { status: 503 });
  }

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

  const { tier, months, locale } = parsed.data;
  const loc = locale ?? "uz";

  await ensureDefaultManagedPlans();
  const managedPlan = await prisma.managedSubscriptionPlan.findFirst({
    where: { slug: tier, isActive: true },
  });
  if (!managedPlan) {
    return NextResponse.json({ ok: false, error: "plan_not_found" }, { status: 404 });
  }

  let billingId = builder.billingId;
  let refreshedCookie = false;
  if (!billingId) {
    const acc = await prisma.billingAccount.create({ data: {} });
    billingId = acc.id;
    refreshedCookie = true;
  }

  const { tiyin, uzs } = computeCheckoutAmountTiyinFromManagedPlan(managedPlan, months);
  const returnUrl = `${appBaseUrl()}/${loc}/dashboard?payme=1`;

  const checkoutUrl = buildPaymeCheckoutUrl({
    merchantId: creds.merchantId,
    amountTiyin: tiyin,
    billingAccountId: billingId,
    planTier: tier as PaymePlanTier,
    billingMonths: months,
    returnUrl,
    lang: loc,
  });

  const response = NextResponse.json({
    ok: true as const,
    checkoutUrl,
    amountTiyin: tiyin,
    amountUzs: uzs,
    billingAccountId: billingId,
  });

  if (refreshedCookie) {
    const token = createBuilderSessionToken({
      tier: builder.tier,
      subscriptionUntilMs: builder.subscriptionUntilMs,
      billingId,
      webUserId: builder.webUserId,
      webSessionVersion: builder.webSessionVersion,
    });
    response.cookies.set(BUILDER_SESSION_COOKIE, token, builderSessionSetCookieOptions(request));
  }

  return response;
}
