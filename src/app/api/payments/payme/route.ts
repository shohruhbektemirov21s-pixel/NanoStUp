import { NextResponse } from "next/server";

import { handlePaymeMerchantRpc } from "@/lib/payme/merchant-handlers";
import { readPaymeCredentials, verifyPaymeBasicAuth } from "@/lib/payme/merchant-auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const creds = readPaymeCredentials();
  if (!creds) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32400, message: "payme not configured" } },
      { status: 503 },
    );
  }

  const authOk = verifyPaymeBasicAuth(request.headers.get("authorization"), creds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  const { status, json } = await handlePaymeMerchantRpc(body, authOk);
  return NextResponse.json(json, { status });
}
