import { NextResponse } from "next/server";

import { BUILDER_SESSION_COOKIE } from "@/lib/builder/builder-session";

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUILDER_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
