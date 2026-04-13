"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useLocalePreferenceStore } from "@/shared/stores/locale-preference-store";

/**
 * After Zustand rehydrates from localStorage, align the URL locale with the saved preference.
 */
export function LocaleBootstrap() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      const preferred = useLocalePreferenceStore.getState().preferredLocale;
      if (preferred && preferred !== locale) {
        router.replace(pathname, { locale: preferred });
      }
    };

    if (useLocalePreferenceStore.persist.hasHydrated()) {
      sync();
    }

    return useLocalePreferenceStore.persist.onFinishHydration(sync);
  }, [locale, pathname, router]);

  return null;
}
