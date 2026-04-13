"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

function labelFor(t: (key: "uz" | "ru" | "en") => string, code: AppLocale): string {
  switch (code) {
    case "uz":
      return t("uz");
    case "ru":
      return t("ru");
    case "en":
      return t("en");
    default:
      return code;
  }
}

type LocaleSegmentControlProps = {
  className?: string;
  /** Tighter padding for the fixed dock */
  compact?: boolean;
};

export const LocaleSegmentControl = memo(function LocaleSegmentControl({
  className,
  compact,
}: LocaleSegmentControlProps) {
  const t = useTranslations("Language");
  const { locale, locales, setLanguage } = useLanguage();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      aria-label={t("segmentAria")}
      className={cn(
        "inline-flex items-center rounded-2xl border border-border/80 bg-white/95 p-1 shadow-sm shadow-slate-900/5 backdrop-blur-md dark:border-white/12 dark:bg-slate-900/90 dark:shadow-black/30",
        compact ? "gap-0" : "gap-0.5",
        className,
      )}
    >
      {locales.map((code) => {
        const active = code === locale;
        return (
          <motion.button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={active}
            title={t("switchTo", { locale: labelFor(t, code) })}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className={cn(
              "relative min-w-[2.85rem] rounded-xl px-2.5 py-2 text-center text-[11px] font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
              active
                ? "bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-500/30"
                : "text-muted-foreground hover:bg-muted/90 hover:text-foreground dark:hover:bg-white/10",
              compact ? "py-1.5 sm:py-2" : "py-2",
            )}
          >
            <span className="relative z-10">{code.toUpperCase()}</span>
          </motion.button>
        );
      })}
    </div>
  );
});

LocaleSegmentControl.displayName = "LocaleSegmentControl";
