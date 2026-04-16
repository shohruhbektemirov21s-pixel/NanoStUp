import "server-only";

import { isAdminSession } from "@/lib/admin/session";
import { getBuilderSessionPayload } from "@/lib/builder/builder-session";

/** RSC birinchi render uchun — client `/me` dan oldin UI “mehmon” deb chaqnmasin. */
export function getBuilderSessionServerSnapshot(): { authenticated: boolean } {
  const admin = isAdminSession();
  const builder = getBuilderSessionPayload();
  return { authenticated: Boolean(admin || builder) };
}
