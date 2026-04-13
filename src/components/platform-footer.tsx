"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  PLATFORM_DEV_PHONE_COMPACT,
  PLATFORM_DEV_PHONE_TEL,
  PLATFORM_DEV_TELEGRAM_HANDLE,
  PLATFORM_DEV_TELEGRAM_URL,
} from "@/shared/lib/platform-developer-footer";

export function PlatformFooter() {
  const t = useTranslations("PlatformFooter");
  const reduced = useReducedMotion();

  return (
    <motion.footer
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      className="relative z-20 mt-auto overflow-hidden px-4 py-12 sm:py-14"
      role="contentinfo"
      aria-label={t("ariaLabel")}
    >
      {/* Soft gradient divider seamlessly blending into footer */}
      <div className="absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent dark:via-primary/30" />

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 rounded-2xl border border-border/50 bg-white/60 px-5 py-8 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/50 sm:px-8">
        <p className="text-center text-[13px] font-medium leading-relaxed text-muted-foreground sm:text-sm">{t("disclaimer")}</p>

        <div className="flex w-full flex-col items-center gap-5 border-t border-border/40 pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("contactTitle")}</p>
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-12">
            <a
              href={PLATFORM_DEV_PHONE_TEL}
              className="group inline-flex items-center gap-3 text-sm font-semibold text-foreground transition-all hover:text-primary"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary shadow-sm shadow-primary/10 transition-all group-hover:scale-110 group-hover:bg-primary/10 group-hover:shadow-primary/20 dark:bg-primary/10">
                <Phone className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-primary/70">
                  {t("phoneLabel")}
                </span>
                {PLATFORM_DEV_PHONE_COMPACT}
              </span>
            </a>
            <a
              href={PLATFORM_DEV_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 text-sm font-semibold text-foreground transition-all hover:text-sky-500"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/5 text-sky-500 shadow-sm shadow-sky-500/10 transition-all group-hover:scale-110 group-hover:bg-sky-500/10 group-hover:shadow-sky-500/20 dark:bg-sky-500/10">
                <Send className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-sky-500/70">
                  {t("telegramLabel")}
                </span>
                {PLATFORM_DEV_TELEGRAM_HANDLE}
              </span>
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/50">{t("rights")}</p>
      </div>
    </motion.footer>
  );
}
