"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSegmentControl } from "@/components/locale-segment-control";
import { cn } from "@/lib/utils";

/**
 * Always-visible language control (mobile + desktop) — high contrast on any background.
 */
export function FixedLocaleDock() {
  const t = useTranslations("Language");
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className={cn(
        "pointer-events-auto fixed bottom-4 right-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 pl-2.5 shadow-lg shadow-slate-900/10 backdrop-blur-xl dark:border-white/12 dark:bg-slate-950/95 dark:shadow-black/40 sm:bottom-5 sm:right-5",
      )}
      role="region"
      aria-label={t("fixedDockAria")}
    >
      <span className="hidden text-slate-500 sm:flex sm:items-center sm:gap-1.5 sm:pl-1">
        <Languages className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t("label")}</span>
      </span>
      <LocaleSegmentControl compact className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent" />
    </motion.div>
  );
}
