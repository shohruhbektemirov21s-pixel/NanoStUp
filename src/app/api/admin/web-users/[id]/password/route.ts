import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminActorLabel } from "@/lib/admin/actor";
import { writeAdminAuditLog } from "@/lib/admin/audit-log";
import { isAdminSession } from "@/lib/admin/session";
import { hashPasswordScrypt } from "@/lib/auth/password-scrypt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  newPassword: z.string().min(12).max(200),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Sets a new password from admin-supplied plaintext (HTTPS only).
 * Response never includes password or hash.
 */
export async function POST(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }
  const actor = getAdminActorLabel();
  const hash = hashPasswordScrypt(parsed.data.newPassword);
  try {
    await prisma.webUser.update({
      where: { id },
      data: { passwordHash: hash },
    });
    await writeAdminAuditLog({
      action: "WEB_USER_PASSWORD_SET_BY_ADMIN",
      actor,
      targetWebUserId: id,
      payload: { algorithm: "scrypt" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
