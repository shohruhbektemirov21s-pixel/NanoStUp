import "server-only";

/**
 * Label stored in audit logs / managed rows (never a password).
 * Set ADMIN_AUDIT_ACTOR in production (e.g. ops email or SSO subject).
 */
export function getAdminActorLabel(): string {
  const fromEnv = process.env.ADMIN_AUDIT_ACTOR?.trim();
  if (fromEnv) {
    return fromEnv.slice(0, 256);
  }
  return "admin:cookie-session";
}
