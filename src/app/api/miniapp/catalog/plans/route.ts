import { NextResponse } from "next/server";

import { ensureDefaultManagedPlans } from "@/lib/admin/default-managed-plans";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Mini App uchun ochiq tariflar ro‘yxati (admin emas). */
export async function GET(): Promise<NextResponse> {
  try {
    await ensureDefaultManagedPlans();
    const plans = await prisma.managedSubscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        priceMinor: true,
        discountPriceMinor: true,
        billingPeriodDays: true,
        generationLimit: true,
        exportLimit: true,
      },
    });
    return NextResponse.json({ ok: true, plans });
  } catch (e) {
    console.error("[miniapp/catalog/plans]", e);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
