import { NextResponse } from "next/server";

import { BUILDER_SESSION_COOKIE, createBuilderSessionToken } from "@/lib/builder/builder-session";

type Body = { password?: string };

export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const expected = process.env.BUILDER_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false, error: "builder_not_configured" }, { status: 503 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const token = createBuilderSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BUILDER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
