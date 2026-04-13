"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Download, MessageSquare, MonitorPlay, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

const icons = [MessageSquare, Sparkles, MonitorPlay, Download] as const;

export function HomeBuilderFlow() {
  const t = useTranslations("Home");
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mt-12 max-w-4xl"
    >
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">{t("flowKicker")}</p>
      <h2 className="mt-2 text-center text-lg font-bold tracking-tight text-foreground sm:text-xl">{t("flowTitle")}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">{t("flowSubtitle")}</p>
      <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([0, 1, 2, 3] as const).map((i) => {
          const Icon = icons[i];
          return (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-border/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-indigo-500/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t(`flowStep${i + 1}Kicker`)}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{t(`flowStep${i + 1}Title`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(`flowStep${i + 1}Desc`)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
