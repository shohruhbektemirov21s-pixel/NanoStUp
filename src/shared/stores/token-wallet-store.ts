import { create } from "zustand";
import { persist } from "zustand/middleware";

import { FIX_WEBSITE_TOKEN_COST, PAID_MULTI_GENERATION_THRESHOLD } from "@/lib/tokens/website-token-cost";

/** 3 bepul + kamida bitta ko‘p sahifali (50) uchun yetarli zaxira. */
const INITIAL_TOKEN_BALANCE = 50;
const INITIAL_FREE_GENERATIONS = 3;

type TokenWalletState = {
  /** Qolgan tokenlar (bepul 3 marta tugagach yechiladi). */
  tokenBalance: number;
  /** Muvaffaqiyatli sayt generatsiyasi uchun bepul slotlar. */
  freeGenerationsRemaining: number;
};

type TokenWalletActions = {
  /** Server (Payme / billing) balansini brauzer zustand bilan sinxronlash. */
  setTokenBalanceFromServer: (balance: number) => void;
  /** Yangi foydalanuvchi / brauzer uchun standart sovg‘a. */
  resetTrial: () => void;
  /** Generatsiya oldidan: bepul slot yoki tokenlar yetarlimi? */
  canStartPaidGeneration: () => boolean;
  canStartFreeGeneration: () => boolean;
  canAffordFix: () => boolean;
  /** Generatsiya muvaffaqiyatidan keyin sxema bo‘yicha yechim. */
  finalizeGenerationCharge: (cost: number) => void;
  /** Bugfix muvaffaqiyatidan keyin. */
  finalizeFixCharge: () => void;
};

export type TokenWalletStore = TokenWalletState & TokenWalletActions;

export const useTokenWalletStore = create<TokenWalletStore>()(
  persist(
    (set, get) => ({
      tokenBalance: INITIAL_TOKEN_BALANCE,
      freeGenerationsRemaining: INITIAL_FREE_GENERATIONS,

      setTokenBalanceFromServer: (balance) =>
        set({
          tokenBalance: Math.max(0, Math.round(balance)),
        }),

      resetTrial: () =>
        set({
          tokenBalance: INITIAL_TOKEN_BALANCE,
          freeGenerationsRemaining: INITIAL_FREE_GENERATIONS,
        }),

      canStartFreeGeneration: () => get().freeGenerationsRemaining > 0,

      canStartPaidGeneration: () => get().tokenBalance >= PAID_MULTI_GENERATION_THRESHOLD,

      canAffordFix: () => get().tokenBalance >= FIX_WEBSITE_TOKEN_COST,

      finalizeGenerationCharge: (cost) => {
        const clamped = Math.max(0, Math.round(cost));
        set((s) => {
          if (s.freeGenerationsRemaining > 0) {
            return {
              freeGenerationsRemaining: Math.max(0, s.freeGenerationsRemaining - 1),
            };
          }
          const spend = Math.min(clamped, s.tokenBalance);
          return { tokenBalance: Math.max(0, s.tokenBalance - spend) };
        });
      },

      finalizeFixCharge: () =>
        set((s) => ({
          tokenBalance: Math.max(0, s.tokenBalance - FIX_WEBSITE_TOKEN_COST),
        })),
    }),
    {
      name: "aiwb-token-wallet-v1",
      partialize: (s) => ({
        tokenBalance: s.tokenBalance,
        freeGenerationsRemaining: s.freeGenerationsRemaining,
      }),
    },
  ),
);
