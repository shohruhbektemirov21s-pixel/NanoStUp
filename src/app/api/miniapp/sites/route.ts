import { NextResponse } from "next/server";

import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { createSiteForUser } from "@/features/telegram-bot/services/site.service";
import { readMiniappSessionFromCookies } from "@/lib/telegram/miniapp-session";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const mini = readMiniappSessionFromCookies();
  if (!mini) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const schemaRaw =
    typeof body === "object" && body !== null && "schema" in body ? (body as { schema?: unknown }).schema : undefined;
  const parsed = websiteSchema.safeParse(schemaRaw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_schema" }, { status: 400 });
  }

  try {
    const site = await createSiteForUser(mini.userId, parsed.data);
    return NextResponse.json({ ok: true, siteId: site.id, title: site.title, slug: site.slug });
  } catch {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
}
