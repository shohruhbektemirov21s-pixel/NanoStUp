"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

type AiThinkingOverlayProps = {
  reduced: boolean | null;
};

const ringTransition = { duration: 2.8, repeat: Infinity, ease: "easeInOut" as const };

export const AiThinkingOverlay = memo(function AiThinkingOverlay({ reduced }: AiThinkingOverlayProps) {
  const t = useTranslations("Preview");
  const off = Boolean(reduced);

  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-b from-background/92 via-background/88 to-background/95 px-6 py-8 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("overlayTitle")}
      initial={off ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(var(--primary)/0.12),transparent_55%)]" aria-hidden />

      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-6">
      <div className="relative flex size-36 items-center justify-center sm:size-40">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-primary/25"
            style={{ width: 56 + i * 36, height: 56 + i * 36 }}
            animate={
              off
                ? undefined
                : {
                    scale: [1, 1.06, 1],
                    opacity: [0.35 - i * 0.08, 0.65 - i * 0.06, 0.35 - i * 0.08],
                  }
            }
            transition={{ ...ringTransition, delay: i * 0.25 }}
          />
        ))}

        <motion.div
          className="absolute flex size-[104px] items-center justify-center"
          animate={off ? undefined : { rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          aria-hidden
        >
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="absolute size-1.5 rounded-full bg-primary/65 shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-46px)`,
              }}
            />
          ))}
        </motion.div>

        <motion.div
          className="relative z-[2] flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-white/20"
          animate={off ? undefined : { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="size-8" aria-hidden />
        </motion.div>
      </div>

      <div className="max-w-xs text-center">
        <motion.p
          className="text-sm font-semibold tracking-tight text-foreground"
          animate={off ? undefined : { opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {t("overlayTitle")}
        </motion.p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("aiThinkingHint")}</p>
      </div>

      <div className="flex h-8 items-end justify-center gap-1" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <motion.span
            key={i}
            className="origin-bottom w-1 rounded-full bg-primary/50"
            style={{ height: 6 + (i % 4) * 2 }}
            animate={off ? undefined : { scaleY: [0.35, 1, 0.35] }}
            transition={{
              duration: 0.55 + (i % 5) * 0.05,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.04,
            }}
          />
        ))}
      </div>
      </div>
    </motion.div>
  );
});

AiThinkingOverlay.displayName = "AiThinkingOverlay";
