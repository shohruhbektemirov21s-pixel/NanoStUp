"use client";

import { useEffect } from "react";

import { useTokenWalletStore } from "@/shared/stores/token-wallet-store";

/** Payme to‘lovidan keyin serverdagi token balansini zustand ga yuklash. */
export function DashboardBillingSync() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/builder/me", { credentials: "same-origin" });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as {
          authenticated?: boolean;
          serverTokenBalance?: number | null;
        };
        if (data.authenticated && typeof data.serverTokenBalance === "number") {
          useTokenWalletStore.getState().setTokenBalanceFromServer(data.serverTokenBalance);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
