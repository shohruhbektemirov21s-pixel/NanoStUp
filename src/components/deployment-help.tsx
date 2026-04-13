"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Rocket, Server } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  PLATFORM_DEV_PHONE_COMPACT,
  PLATFORM_DEV_PHONE_TEL,
  PLATFORM_DEV_TELEGRAM_HANDLE,
  PLATFORM_DEV_TELEGRAM_URL,
} from "@/shared/lib/platform-developer-footer";

export function DeploymentHelp() {
  const t = useTranslations("Deployment");
  const reduced = useReducedMotion();

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mt-16 max-w-5xl space-y-6"
      aria-labelledby="deployment-help-title"
    >
      <h2 id="deployment-help-title" className="text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("sectionTitle")}
      </h2>

      <div className="grid gap-5 md:grid-cols-2">
        <motion.article
          className="rounded-2xl border border-white/20 bg-white/50 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40"
          whileHover={reduced ? undefined : { y: -3 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
        >
          <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t("aboutTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("aboutBody")}</p>
        </motion.article>

        <motion.article
          className="rounded-2xl border border-white/20 bg-white/50 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40"
          whileHover={reduced ? undefined : { y: -3 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
        >
          <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Server className="size-5" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t("deployTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("deployBody")}</p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t("deployVercel")}</li>
            <li>{t("deployNetlify")}</li>
            <li>{t("deployZip")}</li>
          </ul>
        </motion.article>
      </div>

      <motion.div
        className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-white/80 to-sky-50/90 p-6 shadow-lg backdrop-blur-xl dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-950/50 dark:to-sky-950/30"
        whileHover={reduced ? undefined : { scale: 1.005 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      >
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Rocket className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">{t("domainCardTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("domainCardBody")}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={PLATFORM_DEV_PHONE_TEL}
                className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-foreground shadow-md ring-1 ring-slate-200/80 transition hover:bg-white dark:bg-slate-900/80 dark:ring-slate-700"
              >
                {PLATFORM_DEV_PHONE_COMPACT}
              </a>
              <a
                href={PLATFORM_DEV_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-500"
              >
                {PLATFORM_DEV_TELEGRAM_HANDLE}
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
