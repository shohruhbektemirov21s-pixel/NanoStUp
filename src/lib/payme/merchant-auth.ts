import "server-only";

import { timingSafeEqual } from "node:crypto";

function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function readPaymeCredentials(): { merchantId: string; merchantKey: string } | null {
  const merchantId = process.env.PAYME_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYME_MERCHANT_KEY?.trim();
  if (!merchantId || !merchantKey) {
    return null;
  }
  return { merchantId, merchantKey };
}

/** Payme Merchant API: `Authorization: Basic base64(merchant_id:merchant_key)` */
export function verifyPaymeBasicAuth(headerValue: string | null, expected: { merchantId: string; merchantKey: string }): boolean {
  if (!headerValue || !headerValue.startsWith("Basic ")) {
    return false;
  }
  let decoded: string;
  try {
    decoded = Buffer.from(headerValue.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) {
    return false;
  }
  const id = decoded.slice(0, idx);
  const key = decoded.slice(idx + 1);
  return timingSafeStringEqual(id, expected.merchantId) && timingSafeStringEqual(key, expected.merchantKey);
}
