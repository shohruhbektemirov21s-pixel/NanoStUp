import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin/session";
import { receiptAbsolutePathFromDb } from "@/lib/receipts/upload-paths";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: { id: string } }): Promise<NextResponse> {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = ctx.params;
  if (!id || id.length > 80) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const row = await prisma.receiptVerification.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const abs = receiptAbsolutePathFromDb(row.storagePath);
    const body = await readFile(abs);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }
}
