"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { clientApiUrl } from "@/lib/client-api-url";

export function DashboardLogoutButton({ show }: Readonly<{ show: boolean }>) {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await fetch(clientApiUrl("/api/auth/builder/logout"), { method: "POST", credentials: "include" });
      toast.success(t("loggedOut"));
      router.push("/builder-login");
      router.refresh();
    } catch {
      toast.error(t("logoutFailed"));
    } finally {
      setBusy(false);
    }
  }, [router, t]);

  if (!show) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-xl border border-border/80 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
    >
      {busy ? "…" : t("logout")}
    </button>
  );
}
