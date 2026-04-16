import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { computeCheckoutAmountTiyin, computeCheckoutAmountTiyinFromManagedPlan } from "@/lib/payme/checkout";
import { prisma } from "@/lib/prisma";
import { parseBillingMonths, parsePaymePlanTier, tokensGrantedForPlanMonths, type PaymePlanTier } from "@/lib/payme/pricing";

const ERR_INVALID_AMOUNT = -31001;
const ERR_NOT_FOUND = -31003;
const ERR_UNABLE = -31008;
const ERR_ACCOUNT = -31050;
const ERR_SYSTEM = -32400;

type RpcId = string | number | null;

function rpcError(id: RpcId, code: number, message: string, data?: string) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  };
}

function rpcResult<T>(id: RpcId, result: T) {
  return { jsonrpc: "2.0" as const, id, result };
}

function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function parseAccount(account: unknown): { userId: string; plan: PaymePlanTier; months: number } | null {
  if (!account || typeof account !== "object") {
    return null;
  }
  const o = account as Record<string, unknown>;
  const userId = typeof o.user_id === "string" && o.user_id.length > 0 ? o.user_id : null;
  const plan = parsePaymePlanTier(o.plan);
  const months = parseBillingMonths(o.months);
  if (!userId || !plan || months === null) {
    return null;
  }
  return { userId, plan, months };
}

async function expectedAmountTiyin(plan: PaymePlanTier, months: number): Promise<number> {
  const row = await prisma.managedSubscriptionPlan.findFirst({ where: { slug: plan, isActive: true } });
  if (row) {
    return computeCheckoutAmountTiyinFromManagedPlan(row, months).tiyin;
  }
  return computeCheckoutAmountTiyin(plan, months).tiyin;
}

export async function handlePaymeMerchantRpc(
  body: unknown,
  authOk: boolean,
): Promise<{ status: number; json: Record<string, unknown> }> {
  if (!authOk) {
    const id = typeof (body as { id?: RpcId })?.id !== "undefined" ? (body as { id: RpcId }).id : null;
    return { status: 200, json: rpcError(id, -32504, "permission denied") };
  }

  const req = body as { jsonrpc?: string; method?: string; params?: Record<string, unknown>; id?: RpcId };
  const id: RpcId = req.id ?? null;

  if (!req.method) {
    return { status: 200, json: rpcError(id, -32600, "Invalid Request") };
  }

  try {
    switch (req.method) {
      case "CheckPerformTransaction":
        return { status: 200, json: await checkPerformTransaction(id, req.params) };
      case "CreateTransaction":
        return { status: 200, json: await createTransaction(id, req.params) };
      case "PerformTransaction":
        return { status: 200, json: await performTransaction(id, req.params) };
      case "CancelTransaction":
        return { status: 200, json: await cancelTransaction(id, req.params) };
      case "CheckTransaction":
        return { status: 200, json: await checkTransaction(id, req.params) };
      default:
        return { status: 200, json: rpcError(id, -32601, "Method not found") };
    }
  } catch (e) {
    console.error("[payme]", e);
    return { status: 200, json: rpcError(id, ERR_SYSTEM, "system error") };
  }
}

async function checkPerformTransaction(id: RpcId, params: Record<string, unknown> | undefined) {
  const amount = typeof params?.amount === "number" ? params.amount : null;
  const parsed = parseAccount(params?.account);
  if (amount === null || !Number.isFinite(amount) || !parsed) {
    return rpcError(id, ERR_ACCOUNT, "Invalid account", "account");
  }

  const acc = await prisma.billingAccount.findUnique({ where: { id: parsed.userId } });
  if (!acc) {
    return rpcError(id, ERR_ACCOUNT, "User not found", "user_id");
  }

  const expected = await expectedAmountTiyin(parsed.plan, parsed.months);
  if (amount !== expected) {
    return rpcError(id, ERR_INVALID_AMOUNT, "Invalid amount");
  }

  return rpcResult(id, { allow: true });
}

async function createTransaction(id: RpcId, params: Record<string, unknown> | undefined) {
  const paymeId = typeof params?.id === "string" ? params.id : null;
  const time = typeof params?.time === "number" ? params.time : null;
  const amount = typeof params?.amount === "number" ? params.amount : null;
  const parsed = parseAccount(params?.account);

  if (!paymeId || time === null || amount === null || !parsed) {
    return rpcError(id, ERR_ACCOUNT, "Invalid params", "account");
  }

  const existing = await prisma.paymentTransaction.findUnique({ where: { paymeId } });
  if (existing) {
    return rpcResult(id, {
      create_time: existing.createdAt.getTime(),
      transaction: existing.merchantTxnId,
      state: existing.paymeState,
      perform_time: existing.performedAt?.getTime() ?? 0,
      cancel_time: existing.cancelledAt?.getTime() ?? 0,
    });
  }

  const billing = await prisma.billingAccount.findUnique({ where: { id: parsed.userId } });
  if (!billing) {
    return rpcError(id, ERR_ACCOUNT, "User not found", "user_id");
  }

  const expected = await expectedAmountTiyin(parsed.plan, parsed.months);
  if (amount !== expected) {
    return rpcError(id, ERR_INVALID_AMOUNT, "Invalid amount");
  }

  const merchantTxnId = randomUUID().replace(/-/g, "");

  const row = await prisma.paymentTransaction.create({
    data: {
      paymeId,
      merchantTxnId,
      billingAccountId: parsed.userId,
      amount,
      status: "pending",
      paymeState: 1,
      planTier: parsed.plan,
      billingMonths: parsed.months,
      metadata: { paymeTime: time } as Prisma.InputJsonValue,
    },
  });

  return rpcResult(id, {
    create_time: row.createdAt.getTime(),
    transaction: row.merchantTxnId,
    state: 1,
  });
}

async function performTransaction(id: RpcId, params: Record<string, unknown> | undefined) {
  const paymeId = typeof params?.id === "string" ? params.id : null;
  if (!paymeId) {
    return rpcError(id, ERR_NOT_FOUND, "Transaction not found");
  }

  const row = await prisma.paymentTransaction.findUnique({ where: { paymeId } });
  if (!row) {
    return rpcError(id, ERR_NOT_FOUND, "Transaction not found");
  }

  if (row.paymeState === 2) {
    return rpcResult(id, {
      transaction: row.merchantTxnId,
      perform_time: row.performedAt?.getTime() ?? Date.now(),
      state: 2,
    });
  }

  if (row.paymeState !== 1) {
    return rpcError(id, ERR_UNABLE, "Unable to perform transaction");
  }

  const plan = parsePaymePlanTier(row.planTier) ?? "basic";
  const months = row.billingMonths ?? 1;
  const tokens = tokensGrantedForPlanMonths(plan, months);
  const performTime = Date.now();

  await prisma.$transaction(async (tx) => {
    const cur = await tx.billingAccount.findUnique({ where: { id: row.billingAccountId } });
    if (!cur) {
      throw new Error("billing missing");
    }
    const now = new Date();
    const currentEnd = cur.subscriptionUntil && cur.subscriptionUntil > now ? cur.subscriptionUntil : now;
    const newUntil = addMonthsUtc(currentEnd, months);

    await tx.billingAccount.update({
      where: { id: row.billingAccountId },
      data: {
        tokenBalance: { increment: tokens },
        planTier: plan,
        subscriptionUntil: newUntil,
      },
    });

    await tx.paymentTransaction.update({
      where: { id: row.id },
      data: {
        status: "completed",
        paymeState: 2,
        performedAt: new Date(performTime),
      },
    });
  });

  return rpcResult(id, {
    transaction: row.merchantTxnId,
    perform_time: performTime,
    state: 2,
  });
}

async function cancelTransaction(id: RpcId, params: Record<string, unknown> | undefined) {
  const paymeId = typeof params?.id === "string" ? params.id : null;
  if (!paymeId) {
    return rpcError(id, ERR_NOT_FOUND, "Transaction not found");
  }

  const row = await prisma.paymentTransaction.findUnique({ where: { paymeId } });
  if (!row) {
    return rpcError(id, ERR_NOT_FOUND, "Transaction not found");
  }

  if (row.paymeState === 2) {
    return rpcError(id, ERR_UNABLE, "Already performed");
  }

  if (row.paymeState === -1) {
    return rpcResult(id, {
      transaction: row.merchantTxnId,
      cancel_time: row.cancelledAt?.getTime() ?? Date.now(),
      state: -1,
    });
  }

  const cancelTime = Date.now();
  await prisma.paymentTransaction.update({
    where: { id: row.id },
    data: {
      status: "cancelled",
      paymeState: -1,
      cancelledAt: new Date(cancelTime),
    },
  });

  return rpcResult(id, {
    transaction: row.merchantTxnId,
    cancel_time: cancelTime,
    state: -1,
  });
}

async function checkTransaction(id: RpcId, params: Record<string, unknown> | undefined) {
  const paymeId = typeof params?.id === "string" ? params.id : null;
  if (!paymeId) {
    return rpcError(id, ERR_NOT_FOUND, "Transaction not found");
  }
  const row = await prisma.paymentTransaction.findUnique({ where: { paymeId } });
  if (!row) {
    return rpcError(id, ERR_NOT_FOUND, "Transaction not found");
  }

  return rpcResult(id, {
    create_time: row.createdAt.getTime(),
    perform_time: row.performedAt?.getTime() ?? 0,
    cancel_time: row.cancelledAt?.getTime() ?? 0,
    transaction: row.merchantTxnId,
    state: row.paymeState,
    reason: null,
  });
}
