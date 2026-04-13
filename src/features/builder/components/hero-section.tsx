"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { AnimatedSection } from "./animated-section";
import { focusRing, mutedText, sectionShell } from "./section-theme";
import type { HeroSectionProps } from "../types/section.types";

export function HeroSection({
  id,
  className,
  theme,
  title,
  description,
  eyebrow,
  primaryAction,
  secondaryAction,
}: HeroSectionProps) {
  const reactId = useId().replace(/:/g, "");
  const sectionId = id ?? `hero-${reactId}`;
  const titleId = `${sectionId}-title`;
  const descId = `${sectionId}-desc`;
  const reduced = useReducedMotion();

  return (
    <AnimatedSection
      id={sectionId}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={cn(sectionShell(theme), className)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div
          className={cn(
            "absolute -left-24 top-0 size-[420px] rounded-full blur-3xl",
            theme === "light" && "bg-indigo-200/50",
            theme === "dark" && "bg-indigo-500/20",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "absolute -right-24 bottom-0 size-[380px] rounded-full blur-3xl",
            theme === "light" && "bg-sky-200/40",
            theme === "dark" && "bg-sky-500/15",
          )}
          aria-hidden
        />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl flex-1">
          {eyebrow ? (
            <motion.p
              className={cn(
                "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                theme === "light" && "border-slate-200 bg-white/80 text-slate-700",
                theme === "dark" && "border-slate-700 bg-slate-900/70 text-slate-200",
              )}
              initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.05 }}
            >
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              {eyebrow}
            </motion.p>
          ) : null}

          <h1
            id={titleId}
            className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>
          <p id={descId} className={cn("mt-5 max-w-xl text-pretty text-base sm:text-lg", mutedText(theme))}>
            {description}
          </p>

          {(primaryAction ?? secondaryAction) ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {primaryAction ? (
                <a
                  href={primaryAction.href}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm",
                    theme === "light" && "bg-slate-900 text-white hover:bg-slate-800",
                    theme === "dark" && "bg-white text-slate-950 hover:bg-slate-100",
                    focusRing(theme),
                  )}
                >
                  {primaryAction.label}
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              ) : null}
              {secondaryAction ? (
                <a
                  href={secondaryAction.href}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold",
                    theme === "light" &&
                      "border-slate-300 bg-white/70 text-slate-900 hover:border-slate-400",
                    theme === "dark" &&
                      "border-slate-700 bg-slate-950/40 text-slate-50 hover:border-slate-500",
                    focusRing(theme),
                  )}
                >
                  {secondaryAction.label}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <motion.div
          className={cn(
            "relative flex-1 rounded-3xl border p-6 sm:p-8 lg:max-w-md",
            theme === "light" && "border-slate-200/80 bg-white/70",
            theme === "dark" && "border-slate-800/80 bg-slate-900/50",
          )}
          initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{
            duration: reduced ? 0 : 0.45,
            ease: [0.22, 1, 0.36, 1],
            delay: reduced ? 0 : 0.08,
          }}
          aria-hidden
        >
          <div className="space-y-4">
            <div className={cn("h-2 w-2/3 rounded-full", theme === "light" ? "bg-slate-200" : "bg-slate-700")} />
            <div className={cn("h-2 w-full rounded-full", theme === "light" ? "bg-slate-100" : "bg-slate-800")} />
            <div className={cn("h-2 w-5/6 rounded-full", theme === "light" ? "bg-slate-100" : "bg-slate-800")} />
          </div>
          <p className={cn("mt-6 text-sm", mutedText(theme))}>
            Preview layout — AI generatsiyasi bu yerga sayt bloklarini joylashtiradi.
          </p>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
