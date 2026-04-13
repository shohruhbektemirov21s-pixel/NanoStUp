import "server-only";

import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/prisma";
import { analyzeReceiptExif, isSuspiciousEditingSoftware } from "@/lib/receipts/exif-analyze";
import { analyzeReceiptImageWithGemini } from "@/lib/receipts/gemini-receipt-vision";
import { ensureReceiptUploadDir, receiptStorageRelativePath } from "@/lib/receipts/upload-paths";
import { textContainsAmountUzs, textContainsMsisdn, textContainsPaymentCode } from "@/lib/receipts/text-match";

function extFromMime(mime: string): string {
  if (mime === "image/png") {
    return ".png";
  }
  if (mime === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

function expectedPhoneFromEnv(): string {
  return (process.env.RECEIPT_EXPECTED_MSISDN ?? "").replace(/\D/g, "");
}

export type VerifyReceiptInput = {
  billingAccountId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Telegram chat id (raqam qatori) — tasdiqlash xabari uchun. */
  notifyTelegramId?: string | null;
};

export type VerifyReceiptOutput = {
  id: string;
  suspiciousEdit: boolean;
  exifSoftware: string | null;
  hasExpectedPhone: boolean;
  hasExpectedAmount: boolean;
  hasPaymentCode: boolean;
  paymentCodeChecked: string | null;
  ocrRaw: string | null;
  ocrWarnings: string[];
};

export async function verifyAndStoreReceipt(input: VerifyReceiptInput): Promise<VerifyReceiptOutput> {
  const id = randomUUID();
  const ext = extFromMime(input.mimeType);
  const fileName = `${id}${ext}`;
  const dir = await ensureReceiptUploadDir();
  const absPath = join(dir, fileName);
  await writeFile(absPath, input.buffer);

  const rel = receiptStorageRelativePath(fileName);

  const exif = await analyzeReceiptExif(absPath, input.buffer);
  const suspiciousEdit = isSuspiciousEditingSoftware(exif.software);

  const activeCode = await prisma.receiptPaymentCode.findFirst({
    where: {
      billingAccountId: input.billingAccountId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  const expectedPhone = expectedPhoneFromEnv();
  const paymentCode = activeCode?.code ?? "";
  const expectedAmount = activeCode?.expectedAmountUzs ?? 0;

  const b64 = input.buffer.toString("base64");
  const vision = await analyzeReceiptImageWithGemini({
    imageBase64: b64,
    mimeType: input.mimeType,
    expectedPhoneDigits: expectedPhone,
    expectedAmountUzs: expectedAmount,
    paymentCode,
  });

  const ocrBlob = vision?.ocrSummary ?? "";
  const heurPhone = textContainsMsisdn(ocrBlob, expectedPhone);
  const heurAmount = textContainsAmountUzs(ocrBlob, expectedAmount);
  const heurCode = textContainsPaymentCode(ocrBlob, paymentCode);

  const hasExpectedPhone = Boolean(expectedPhone) && (Boolean(vision?.contains_phone) || heurPhone);
  const hasExpectedAmount =
    expectedAmount > 0 && (Boolean(vision?.contains_amount) || heurAmount);
  const hasPaymentCode = Boolean(paymentCode) && (Boolean(vision?.contains_code) || heurCode);

  const ocrWarnings: string[] = [];
  if (!expectedPhone) {
    ocrWarnings.push("phone_not_configured");
  } else if (!hasExpectedPhone) {
    ocrWarnings.push("missing_expected_phone");
  }
  if (!activeCode) {
    ocrWarnings.push("no_active_payment_code");
  } else if (!hasPaymentCode) {
    ocrWarnings.push("missing_payment_code_in_receipt");
  }
  if (expectedAmount <= 0) {
    ocrWarnings.push("amount_unknown");
  } else if (!hasExpectedAmount) {
    ocrWarnings.push("missing_expected_amount");
  }
  if (!vision) {
    ocrWarnings.push("gemini_vision_unavailable");
  }

  const row = await prisma.receiptVerification.create({
    data: {
      id,
      billingAccountId: input.billingAccountId,
      originalFileName: input.originalName.slice(0, 240),
      mimeType: input.mimeType,
      storagePath: rel,
      exifSoftware: exif.software,
      suspiciousEdit,
      ocrRaw: ocrBlob || null,
      hasExpectedPhone,
      hasExpectedAmount,
      hasPaymentCode,
      paymentCodeChecked: paymentCode || null,
      ocrWarnings,
      approvalStatus: "pending",
    },
  });

  const tid = input.notifyTelegramId?.replace(/\D/g, "").trim();
  if (tid) {
    await prisma.billingAccount.update({
      where: { id: input.billingAccountId },
      data: { notifyTelegramId: tid },
    });
  }

  return {
    id: row.id,
    suspiciousEdit,
    exifSoftware: exif.software,
    hasExpectedPhone,
    hasExpectedAmount,
    hasPaymentCode,
    paymentCodeChecked: paymentCode || null,
    ocrRaw: row.ocrRaw,
    ocrWarnings,
  };
}
