"use client";

import { motion } from "framer-motion";
import { LogOut, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { notifyBuilderSessionChanged, useBuilderSession } from "@/components/builder-session-provider";
import { LocaleSegmentControl } from "@/components/locale-segment-control";
import { saasNavBtnActive, saasNavBtnGhost, saasOutlinePill, saasPrimaryPill } from "@/components/ui/saas-surface";
import { Link, useRouter } from "@/i18n/navigation";
import { clientApiUrl } from "@/lib/client-api-url";
import { cn } from "@/lib/utils";

function isLocaleHome(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  return /\/(uz|ru|en)$/.test(p);
}

function isPath(pathname: string, suffix: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  return p.endsWith(suffix);
}

export function SiteNavbar() {
  const t = useTranslations("Nav");
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { me } = useBuilderSession();
  const [logoutBusy, setLogoutBusy] = useState(false);

  const authenticated = Boolean(me?.authenticated);
  const displayName =
    me?.webUser?.firstName?.trim() ||
    me?.webUser?.email?.trim() ||
    me?.webUser?.phone?.trim() ||
    t("account");

  const logout = useCallback(async () => {
    setLogoutBusy(true);
    try {
      await fetch(clientApiUrl("/api/auth/builder/logout"), { method: "POST", credentials: "include" });
      notifyBuilderSessionChanged();
      toast.success(t("loggedOutToast"));
      router.push("/builder-login");
      router.refresh();
    } catch {
      toast.error(t("logoutFailedToast"));
    } finally {
      setLogoutBusy(false);
    }
  }, [router, t]);

  return (
    <motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 border-b border-border/60 bg-white/80 text-foreground shadow-[0_8px_30px_-18px_rgba(79,70,229,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/40"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>
          <Link
            href="/"
            className={cn(
              "group flex min-w-0 items-center gap-2.5 rounded-2xl py-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
              isLocaleHome(pathname) && "ring-1 ring-primary/15",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-[1.04]">
              <Sparkles className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-bold tracking-tight">{t("brand")}</span>
              <span className="block truncate text-[11px] font-medium text-muted-foreground">{t("tagline")}</span>
            </span>
          </Link>
        </motion.div>
        <div className="flex max-w-[min(100%,22rem)] flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
          <Link
            href="/pricing"
            className={cn(isPath(pathname, "/pricing") ? saasNavBtnActive : saasNavBtnGhost)}
            aria-current={isPath(pathname, "/pricing") ? "page" : undefined}
          >
            {t("pricing")}
          </Link>
          <Link
            href="/dashboard"
            className={cn(isPath(pathname, "/dashboard") ? saasNavBtnActive : saasNavBtnGhost)}
            aria-current={isPath(pathname, "/dashboard") ? "page" : undefined}
          >
            {t("dashboard")}
          </Link>
          {authenticated ? (
            <>
              <Link href="/dashboard" className={cn(saasOutlinePill, "max-w-[10rem] truncate")} title={displayName}>
                {displayName}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={logoutBusy}
                className={cn(saasNavBtnGhost, "inline-flex items-center gap-1.5 disabled:opacity-50")}
                aria-label={t("logout")}
              >
                <LogOut className="size-3.5 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{t("logout")}</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/builder-signup" className={saasPrimaryPill}>
                {t("signup")}
              </Link>
              <Link href="/builder-login" className={saasOutlinePill}>
                {t("login")}
              </Link>
            </>
          )}
          <LocaleSegmentControl className="hidden sm:inline-flex" />
        </div>
      </div>
    </motion.nav>
  );
}
