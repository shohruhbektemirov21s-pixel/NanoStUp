import "server-only";

import { BUILDER_SESSION_COOKIE, createBuilderSessionToken, type BuilderSessionPayload } from "@/lib/builder/builder-session";
import { prisma } from "@/lib/prisma";
import type { NextResponse } from "next/server";

export async function ensureBillingIdForBuilder(builder: BuilderSessionPayload): Promise<{
  billingId: string;
  newSessionToken: string | null;
}> {
  if (builder.billingId) {
    return { billingId: builder.billingId, newSessionToken: null };
  }
  const acc = await prisma.billingAccount.create({ data: {} });
  const newSessionToken = createBuilderSessionToken({
    tier: builder.tier,
    subscriptionUntilMs: builder.subscriptionUntilMs,
    billingId: acc.id,
  });
  return { billingId: acc.id, newSessionToken };
}

export function applyBuilderSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(BUILDER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}
