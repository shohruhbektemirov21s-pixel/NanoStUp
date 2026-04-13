"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "aiwb-builder-onboarding-v1";

function readDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export const BuilderOnboarding = memo(function BuilderOnboarding() {
  const t = useTranslations("Onboarding");
  const reduced = useReducedMotion();
  const [dismissed, setDismissed] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const steps = useMemo(
    () => [
      { title: t("step1Title"), body: t("step1Body"), target: '[data-onboarding="chat"]' },
      { title: t("step2Title"), body: t("step2Body"), target: '[data-onboarding="preview"]' },
      { title: t("step3Title"), body: t("step3Body"), target: '[data-onboarding="export"]' },
    ],
    [t],
  );

  const close = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= steps.length - 1) {
        close();
        return s;
      }
      return s + 1;
    });
  }, [close, steps.length]);

  useEffect(() => {
    if (dismissed || reduced) {
      return;
    }
    const sel = steps[step]?.target;
    if (!sel) {
      return;
    }
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) {
      return;
    }
    el.classList.add("ring-2", "ring-primary/50", "ring-offset-2", "ring-offset-background", "rounded-2xl");
    return () => {
      el.classList.remove("ring-2", "ring-primary/50", "ring-offset-2", "ring-offset-background", "rounded-2xl");
    };
  }, [dismissed, reduced, step, steps]);

  if (dismissed) {
    return null;
  }

  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto fixed bottom-24 left-1/2 z-[95] w-[min(92vw,420px)] -translate-x-1/2 px-3 sm:bottom-28"
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
      >
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-white/12 dark:bg-slate-950/95 dark:shadow-black/50">
          <div className="flex items-start justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-primary">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              <p id="onboarding-title" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {t("badge")}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={t("closeAria")}
            >
              <X className="size-4" />
            </button>
          </div>
          <h3 className="mt-2 text-base font-bold tracking-tight text-foreground">{current.title}</h3>
          <p id="onboarding-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {current.body}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-muted-foreground">{t("progress", { current: step + 1, total: steps.length })}</p>
            <motion.button
              type="button"
              onClick={next}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25",
              )}
            >
              {step >= steps.length - 1 ? t("done") : t("next")}
              <ChevronRight className="size-3.5" aria-hidden />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

BuilderOnboarding.displayName = "BuilderOnboarding";
