import "server-only";

import { prisma } from "@/lib/prisma";
import { parsePaymePlanTier, tokensGrantedForPlanMonths, type PaymePlanTier } from "@/lib/payme/pricing";
import { sendTelegramOutboundMessage } from "@/lib/telegram/send-outbound-message";

function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function normalizePlan(raw: unknown): PaymePlanTier | null {
  return parsePaymePlanTier(typeof raw === "string" ? raw : "");
}

function normalizeMonths(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(36, Math.floor(n));
}

export async function approveReceiptVerification(input: {
  receiptId: string;
  planTier: unknown;
  billingMonths?: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = normalizePlan(input.planTier);
  if (!plan) {
    return { ok: false, error: "invalid_plan" };
  }
  const months = normalizeMonths(input.billingMonths ?? 1);
  const tokens = tokensGrantedForPlanMonths(plan, months);

  try {
    const txResult = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receiptVerification.findUnique({ where: { id: input.receiptId } });
      if (!receipt) {
        return { err: "not_found" as const };
      }
      if (receipt.approvalStatus !== "pending") {
        return { err: "already_processed" as const };
      }
      if (!receipt.billingAccountId) {
        return { err: "no_billing" as const };
      }

      const billing = await tx.billingAccount.findUnique({ where: { id: receipt.billingAccountId } });
      if (!billing) {
        return { err: "billing_missing" as const };
      }

      const now = new Date();
      const currentEnd =
        billing.subscriptionUntil && billing.subscriptionUntil > now ? billing.subscriptionUntil : now;
      const newUntil = addMonthsUtc(currentEnd, months);

      await tx.billingAccount.update({
        where: { id: billing.id },
        data: {
          tokenBalance: { increment: tokens },
          planTier: plan,
          subscriptionUntil: newUntil,
        },
      });

      if (receipt.hasPaymentCode) {
        const code = receipt.paymentCodeChecked?.trim();
        if (code) {
          const row = await tx.receiptPaymentCode.findFirst({
            where: {
              billingAccountId: billing.id,
              code,
              usedAt: null,
              expiresAt: { gt: now },
            },
          });
          if (row) {
            await tx.receiptPaymentCode.update({
              where: { id: row.id },
              data: { usedAt: now },
            });
          }
        }
      }

      await tx.receiptVerification.update({
        where: { id: receipt.id },
        data: {
          approvalStatus: "approved",
          tokensGranted: tokens,
          planTierGranted: plan,
          billingMonthsGranted: months,
          processedAt: now,
        },
      });

      return { ok: true as const, billing, notifyTelegramId: billing.notifyTelegramId };
    });

    if ("err" in txResult) {
      const failed = txResult as { err: string };
      return { ok: false, error: failed.err };
    }

    const tid = txResult.notifyTelegramId?.trim();
    if (tid) {
      const msg = [
        "✅ To‘lovingiz admin tomonidan tasdiqlandi.",
        `Tarif: ${plan}`,
        `Berilgan tokenlar: +${tokens}`,
        `Obuna muddati yangilandi (${months} oy).`,
      ].join("\n");
      const sent = await sendTelegramOutboundMessage(tid, msg);
      if (!sent.ok) {
        console.warn("[approve-receipt] telegram notify failed", sent.error);
      }
    }

    const telegramUserId = txResult.billing.notifyTelegramId?.trim();
    if (telegramUserId) {
      const user = await prisma.user.findUnique({ where: { telegramId: telegramUserId } });
      if (user) {
        const exp = addMonthsUtc(new Date(), months);
        const existing = await prisma.subscription.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });
        const planLabel = plan === "premium" ? "premium" : plan === "pro" ? "pro" : "basic";
        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan: planLabel,
              billingMonths: months,
              siteTokenLimit: Math.max(existing.siteTokenLimit, tokens),
              expiresAt: exp,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId: user.id,
              plan: planLabel,
              billingMonths: months,
              siteTokenLimit: tokens,
              expiresAt: exp,
            },
          });
        }
      }
    }

    return { ok: true };
  } catch (e) {
    console.error("[approve-receipt]", e);
    return { ok: false, error: "transaction_failed" };
  }
}

export async function rejectReceiptVerification(input: {
  receiptId: string;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const receipt = await prisma.receiptVerification.findUnique({ where: { id: input.receiptId } });
    if (!receipt) {
      return { ok: false, error: "not_found" };
    }
    if (receipt.approvalStatus !== "pending") {
      return { ok: false, error: "already_processed" };
    }
    await prisma.receiptVerification.update({
      where: { id: receipt.id },
      data: {
        approvalStatus: "rejected",
        processedAt: new Date(),
        rejectionReason: input.reason?.slice(0, 2000) ?? null,
      },
    });
    const billing = receipt.billingAccountId
      ? await prisma.billingAccount.findUnique({ where: { id: receipt.billingAccountId } })
      : null;
    const tid = billing?.notifyTelegramId?.trim();
    if (tid) {
      await sendTelegramOutboundMessage(tid, "❌ Chekingiz admin tomonidan rad etildi. Batafsil: qo‘llab-quvvatlash.");
    }
    return { ok: true };
  } catch (e) {
    console.error("[reject-receipt]", e);
    return { ok: false, error: "update_failed" };
  }
}
