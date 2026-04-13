"use client";

import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useTokenWalletStore } from "@/shared/stores/token-wallet-store";

export const DashboardTokenStrip = memo(function DashboardTokenStrip() {
  const t = useTranslations("Wallet");
  const { tokenBalance, freeGenerationsRemaining } = useTokenWalletStore(
    useShallow((s) => ({
      tokenBalance: s.tokenBalance,
      freeGenerationsRemaining: s.freeGenerationsRemaining,
    })),
  );

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100">
      <Coins className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
      <span>{t("freeLeft", { n: freeGenerationsRemaining })}</span>
      <span className="text-muted-foreground">·</span>
      <span>{t("tokens", { n: tokenBalance })}</span>
    </div>
  );
});

DashboardTokenStrip.displayName = "DashboardTokenStrip";
