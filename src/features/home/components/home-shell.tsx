"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { BuilderOnboarding } from "@/components/builder-onboarding";
import { DeploymentHelp } from "@/components/deployment-help";
import { PreviewPanel } from "@/features/builder";
import { Link } from "@/i18n/navigation";
import { websiteSchema } from "@/lib/ai/website-schema.zod";
import {
  useWebsiteStore,
  WEBSITE_BUILDER_DRAFT_STORAGE_KEY,
} from "@/shared/stores/website-store";

import { HomeBuilderFlow } from "./home-builder-flow";
import { PromptPanel } from "./prompt-panel";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  },
};

export function HomeShell() {
  const t = useTranslations("Home");
  const tPreview = useTranslations("Preview");
  const locale = useLocale();
  const schema = useWebsiteStore(useShallow((s) => s.schema));
  const setPlaceholderLabels = useWebsiteStore((s) => s.setPlaceholderLabels);
  const applySchema = useWebsiteStore((s) => s.applySchema);
  const draftRestored = useRef(false);

  useEffect(() => {
    if (schema) return;
    setPlaceholderLabels({
      badge: tPreview("placeholderBadge"),
      title: tPreview("placeholderTitle"),
      lead: tPreview("placeholderLead"),
    });
  }, [schema, locale, setPlaceholderLabels, tPreview]);

  useEffect(() => {
    if (draftRestored.current) {
      return;
    }
    draftRestored.current = true;
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(WEBSITE_BUILDER_DRAFT_STORAGE_KEY) : null;
      if (!raw) {
        return;
      }
      const parsedJson = JSON.parse(raw) as { v?: number; schema?: unknown };
      if (parsedJson.v !== 1 || !parsedJson.schema) {
        return;
      }
      const ok = websiteSchema.safeParse(parsedJson.schema);
      if (!ok.success) {
        return;
      }
      if (!useWebsiteStore.getState().schema) {
        applySchema(ok.data, { skipHistory: true });
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [applySchema]);

  useEffect(() => {
    if (!schema) {
      return;
    }
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          WEBSITE_BUILDER_DRAFT_STORAGE_KEY,
          JSON.stringify({ v: 1, schema, savedAt: Date.now() }),
        );
      } catch {
        /* quota / private mode */
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [schema]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BuilderOnboarding />
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-32 pt-8 sm:px-6 lg:px-8 lg:pb-40 lg:pt-12"
      >
        <header className="relative mx-auto max-w-3xl text-center">
          <div
            className="pointer-events-none absolute -inset-x-20 -top-10 -z-10 mx-auto h-48 max-w-2xl rounded-full bg-gradient-to-b from-primary/15 via-indigo-500/10 to-transparent blur-3xl dark:from-primary/20 dark:via-indigo-500/15"
            aria-hidden
          />
          <motion.div variants={itemVariants} className="inline-block">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1.5 text-sm font-semibold text-primary shadow-sm shadow-primary/10 backdrop-blur-md dark:bg-slate-900/80">
              <Sparkles className="size-4" aria-hidden />
              {t("badge")}
            </span>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            {t("heroTitle")}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            {t("heroSubtitle")}
          </motion.p>
          <motion.div variants={itemVariants} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#builder-workspace"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("heroCtaPrimary")}
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl border border-border/90 bg-white/90 px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/35 hover:bg-primary/[0.04] dark:border-white/10 dark:bg-slate-900/70"
            >
              {t("heroCtaSecondary")}
            </Link>
          </motion.div>
        </header>

        <motion.div variants={itemVariants}>
          <HomeBuilderFlow />
        </motion.div>

        <motion.div
          id="builder-workspace"
          variants={itemVariants}
          className="mt-14 scroll-mt-24 grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12"
        >
          <motion.div variants={itemVariants}>
            <PromptPanel />
          </motion.div>
          <motion.div variants={itemVariants} className="min-w-0">
            <PreviewPanel className="min-w-0" />
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <DeploymentHelp />
        </motion.div>
      </motion.main>
    </div>
  );
}
