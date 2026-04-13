"use client";

import { LayoutGroup, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { memo, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { GENERATION_PHASE_KEYS } from "@/shared/lib/generation-progress";
import { computeGenerationTickPayload, useWebsiteStore } from "@/shared/stores/website-store";

const TICKER_INTERVAL_MS = 4200;
const TICKER_COUNT = 8;

function formatClockCountdown(
  totalSeconds: number,
  t: (key: "timeLeftClock", values: { mm: string; ss: string }) => string,
): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return t("timeLeftClock", {
    mm: String(m).padStart(2, "0"),
    ss: String(s).padStart(2, "0"),
  });
}

function GenerationProgressEngine() {
  const { status, generationStartedAt, generationUiFinishing, generationTotalBudgetSeconds } = useWebsiteStore(
    useShallow((s) => ({
      status: s.status,
      generationStartedAt: s.generationStartedAt,
      generationUiFinishing: s.generationUiFinishing,
      generationTotalBudgetSeconds: s.generationTotalBudgetSeconds,
    })),
  );

  useEffect(() => {
    if (status !== "generating" || generationUiFinishing || generationStartedAt == null) {
      return;
    }

    const tick = () => {
      const s = useWebsiteStore.getState();
      if (s.status !== "generating" || s.generationUiFinishing || s.generationStartedAt == null) {
        return;
      }
      const payload = computeGenerationTickPayload(s.generationStartedAt, s.generationTotalBudgetSeconds, {
        progressPercent: s.progressPercent,
        estimatedTimeLeft: s.estimatedTimeLeft,
      });
      useWebsiteStore.getState().syncGenerationProgress(payload);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status, generationUiFinishing, generationStartedAt, generationTotalBudgetSeconds]);

  return null;
}

function GenerationActivityTicker({ visible }: Readonly<{ visible: boolean }>) {
  const t = useTranslations("GenerationProgress");
  const [index, setIndex] = useState(0);

  const tickerLines = useMemo(
    () => [
      t("ticker0"),
      t("ticker1"),
      t("ticker2"),
      t("ticker3"),
      t("ticker4"),
      t("ticker5"),
      t("ticker6"),
      t("ticker7"),
    ],
    [t],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % TICKER_COUNT);
    }, TICKER_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border/50 bg-muted/25 px-3 py-2">
      <motion.p
        key={index}
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs"
      >
        {tickerLines[index % TICKER_COUNT]}
      </motion.p>
    </div>
  );
}

export const GenerationProgressTracker = memo(function GenerationProgressTracker() {
  const t = useTranslations("GenerationProgress");
  const phaseLabels = useMemo(
    () => ({
      analysis: t("phases.analysis"),
      schema: t("phases.schema"),
      design: t("phases.design"),
      content: t("phases.content"),
      assembly: t("phases.assembly"),
    }),
    [t],
  );

  const { visible, currentStep, estimatedTimeLeft, progressPercent } = useWebsiteStore(
    useShallow((s) => ({
      visible: s.status === "generating" || s.generationUiFinishing,
      currentStep: s.currentStep,
      estimatedTimeLeft: s.estimatedTimeLeft,
      progressPercent: s.progressPercent,
    })),
  );

  if (!visible) {
    return null;
  }

  const timeLabel = formatClockCountdown(estimatedTimeLeft, t);
  const lastIndex = GENERATION_PHASE_KEYS.length - 1;

  return (
    <div className="border-b border-border/60 bg-muted/15 px-4 py-3 sm:px-5">
      <GenerationProgressEngine />
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("heading")}</p>

      <LayoutGroup id="generation-steps">
        <div className="relative flex gap-1 sm:gap-1.5">
          {GENERATION_PHASE_KEYS.map((key, index) => {
            const isComplete = currentStep >= 5 || index < currentStep;
            const isCurrentPill =
              (currentStep < 5 && currentStep === index) || (currentStep === 5 && index === lastIndex);
            return (
              <div key={key} className="relative flex min-w-0 flex-1 flex-col items-center py-1">
                {isCurrentPill ? (
                  <motion.div
                    layoutId="generation-active-pill"
                    className="absolute inset-0 rounded-full bg-primary/14 ring-1 ring-primary/20"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span
                  className={`relative z-[1] truncate px-1.5 text-center text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] ${
                    isComplete ? "text-foreground/85" : "text-muted-foreground/75"
                  }`}
                >
                  {phaseLabels[key]}
                </span>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="mt-3">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80 shadow-inner">
          <motion.div
            layout
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 shadow-sm shadow-sky-500/20"
            initial={false}
            animate={{ width: `${Math.max(0.6, progressPercent)}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
        <motion.p
          layout
          className="mt-2 text-center text-xs font-medium tabular-nums text-muted-foreground"
          key={timeLabel}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {timeLabel}
        </motion.p>
      </div>

      <GenerationActivityTicker visible={visible} />
    </div>
  );
});

GenerationProgressTracker.displayName = "GenerationProgressTracker";
