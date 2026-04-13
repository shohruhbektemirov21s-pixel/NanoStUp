"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { logoutAdminAction } from "@/app/[locale]/login/actions";

export function AdminLogoutButton() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logoutAdminAction();
          router.refresh();
          router.push("/");
        })
      }
      className="rounded-xl border border-border/80 bg-background/80 px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted/60 disabled:opacity-50"
    >
      {t("logout")}
    </button>
  );
}
