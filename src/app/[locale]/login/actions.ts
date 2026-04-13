"use server";

import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "@/lib/admin/session";

export async function loginAdminAction(
  username: string | undefined,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  const expectedLogin = process.env.ADMIN_USERNAME?.trim();
  if (!expected) {
    return { ok: false, error: "ADMIN_PASSWORD muhitda sozlanmagan." };
  }
  if (expectedLogin) {
    const u = typeof username === "string" ? username.trim() : "";
    if (u !== expectedLogin) {
      return { ok: false, error: "Noto‘g‘ri login yoki parol." };
    }
  }
  if (password !== expected) {
    return { ok: false, error: expectedLogin ? "Noto‘g‘ri login yoki parol." : "Noto‘g‘ri parol." };
  }
  cookies().set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return { ok: true };
}

export async function logoutAdminAction(): Promise<void> {
  cookies().delete(ADMIN_SESSION_COOKIE);
}
