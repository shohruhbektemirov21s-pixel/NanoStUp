import { NextResponse } from "next/server";

import { builderSessionClearCookieOptions } from "@/lib/builder/builder-session-cookie-options";
import { BUILDER_SESSION_COOKIE } from "@/lib/builder/builder-session";

export async function POST(request: Request): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUILDER_SESSION_COOKIE, "", builderSessionClearCookieOptions(request));
  return res;
}
