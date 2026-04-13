import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppLocale } from "@/i18n/routing";

type LocalePreferenceState = {
  /** Last explicit UI language choice; drives post-refresh locale sync. */
  preferredLocale: AppLocale | null;
  setPreferredLocale: (next: AppLocale) => void;
};

export const useLocalePreferenceStore = create<LocalePreferenceState>()(
  persist(
    (set) => ({
      preferredLocale: null,
      setPreferredLocale: (next) => set({ preferredLocale: next }),
    }),
    {
      name: "aiwb-locale-preference-v1",
      partialize: (s) => ({ preferredLocale: s.preferredLocale }),
    },
  ),
);
