import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin/session";
import { getBuilderSessionPayload } from "@/lib/builder/builder-session";
import { prisma } from "@/lib/prisma";

function adminDisplayPlan(): string {
  return process.env.ADMIN_AI_PLAN_TIER?.trim().toLowerCase() || "pro";
}

export async function GET(): Promise<NextResponse> {
  const admin = isAdminSession();
  const builder = getBuilderSessionPayload();
  if (!admin && !builder) {
    return NextResponse.json({
      authenticated: false,
      isAdmin: false,
      planTier: null,
      subscriptionUntilMs: null,
      billingAccountId: null,
      serverTokenBalance: null,
    });
  }
  if (admin && !builder) {
    return NextResponse.json({
      authenticated: true,
      isAdmin: true,
      planTier: adminDisplayPlan(),
      subscriptionUntilMs: null,
      billingAccountId: null,
      serverTokenBalance: null,
    });
  }

  let planTier = builder!.tier;
  let subscriptionUntilMs = builder!.subscriptionUntilMs;
  let serverTokenBalance: number | null = null;

  if (builder!.billingId) {
    const acc = await prisma.billingAccount.findUnique({ where: { id: builder!.billingId } });
    if (acc) {
      serverTokenBalance = acc.tokenBalance;
      if (acc.subscriptionUntil && acc.subscriptionUntil.getTime() > Date.now()) {
        const raw = acc.planTier.trim().toLowerCase();
        planTier = raw === "premium" ? "premium" : raw === "pro" ? "pro" : "basic";
        subscriptionUntilMs = acc.subscriptionUntil.getTime();
      }
    }
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin: admin,
    planTier,
    subscriptionUntilMs,
    billingAccountId: builder!.billingId,
    serverTokenBalance,
  });
}
