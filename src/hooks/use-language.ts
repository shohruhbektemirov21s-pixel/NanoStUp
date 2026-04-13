"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useLocalePreferenceStore } from "@/shared/stores/locale-preference-store";

/**
 * UI language: syncs next-intl route locale, NEXT_LOCALE cookie (via next-intl router),
 * and persisted preference (Zustand + localStorage).
 */
export function useLanguage() {
  const intlLocale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const setPreferredLocale = useLocalePreferenceStore((s) => s.setPreferredLocale);

  const setLanguage = useCallback(
    (next: AppLocale) => {
      setPreferredLocale(next);
      if (next === intlLocale) return;
      router.replace(pathname, { locale: next });
    },
    [intlLocale, pathname, router, setPreferredLocale],
  );

  return {
    locale: intlLocale,
    locales: routing.locales,
    setLanguage,
  } as const;
}
