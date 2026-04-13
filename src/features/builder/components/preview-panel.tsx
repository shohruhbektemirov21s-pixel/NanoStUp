"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Download, Loader2, Palette, Redo2, RefreshCw, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { AiThinkingOverlay } from "@/components/ai-thinking-overlay";
import { downloadWebsiteNextZip, downloadWebsiteZip } from "@/features/builder/lib/create-website-zip";
import { clientApiUrl } from "@/lib/client-api-url";
import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { saasElevatedPanel, saasPreviewFrame } from "@/components/ui/saas-surface";
import { cn } from "@/lib/utils";
import { useWebsiteStore, type WebsitePreviewStatus } from "@/shared/stores/website-store";

type StatusBadgeProps = {
  status: WebsitePreviewStatus;
  hasSchema: boolean;
};

const StatusBadge = memo(function StatusBadge({ status, hasSchema }: StatusBadgeProps) {
  const t = useTranslations("Preview");
  const reduced = useReducedMotion();

  if (status === "generating") {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground"
      >
        <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
        <span>{t("statusGenerating")}</span>
        <span className="sr-only">{t("statusGeneratingSr")}</span>
      </motion.span>
    );
  }

  if (status === "error") {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
      >
        <AlertCircle className="size-3.5" aria-hidden />
        <span>{t("statusError")}</span>
        <span className="sr-only">{t("statusErrorSr")}</span>
      </motion.span>
    );
  }

  if (status === "idle" && !hasSchema) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-full border border-border/90 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
      >
        <Clock className="size-3.5" aria-hidden />
        <span>{t("statusPlaceholder")}</span>
        <span className="sr-only">{t("statusPlaceholderSr")}</span>
      </motion.span>
    );
  }

  return (
    <motion.span
      className="inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
      animate={reduced ? undefined : { opacity: [0.82, 1, 0.82] }}
      transition={reduced ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <CheckCircle2 className="size-3.5" aria-hidden />
      <span>{t("statusReady")}</span>
      <span className="sr-only">{t("statusReadySr")}</span>
    </motion.span>
  );
});

type ErrorOverlayProps = {
  message: string;
  onDismiss: () => void;
};

const ErrorOverlay = memo(function ErrorOverlay({ message, onDismiss }: ErrorOverlayProps) {
  const t = useTranslations("Preview");
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/88 p-4 backdrop-blur-md"
      role="alert"
      aria-live="assertive"
      initial={reduced ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      <motion.div
        className="max-w-md rounded-2xl border border-red-200/90 bg-card p-6 text-center shadow-xl dark:border-red-900/60"
        initial={reduced ? undefined : { scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
      >
        <AlertCircle className="mx-auto size-8 text-red-600 dark:text-red-400" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-foreground">{t("errorTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <motion.button
          type="button"
          onClick={onDismiss}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 480, damping: 22 }}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("dismiss")}
        </motion.button>
      </motion.div>
    </motion.div>
  );
});

function PreviewPanelInner({ className }: Readonly<{ className?: string }>) {
  const t = useTranslations("Preview");
  const locale = useLocale();
  const {
    previewSrcDoc,
    previewKey,
    status,
    errorMessage,
    clearPreviewError,
    schema,
    applySchema,
    historyPast,
    historyFuture,
    undoSchema,
    redoSchema,
    refreshPreview,
  } = useWebsiteStore(
    useShallow((s) => ({
      previewSrcDoc: s.previewSrcDoc,
      previewKey: s.previewKey,
      status: s.status,
      errorMessage: s.errorMessage,
      clearPreviewError: s.clearPreviewError,
      schema: s.schema,
      applySchema: s.applySchema,
      historyPast: s.historyPast,
      historyFuture: s.historyFuture,
      undoSchema: s.undoSchema,
      redoSchema: s.redoSchema,
      refreshPreview: s.refreshPreview,
    })),
  );

  const reduced = useReducedMotion();

  const canExport = Boolean(schema) && status !== "generating";
  const canRefreshDesign = Boolean(schema) && status !== "generating";
  const canUndo = Boolean(schema) && historyPast.length > 0 && status !== "generating";
  const canRedo = Boolean(schema) && historyFuture.length > 0 && status !== "generating";

  const handleExport = useCallback(async () => {
    if (!schema) {
      toast.error(t("toastExportNeedSchema"));
      return;
    }
    try {
      await toast.promise(downloadWebsiteZip(schema), {
        loading: t("toastZipLoading"),
        success: t("toastZipSuccess"),
        error: t("toastZipError"),
      });
    } catch {
      toast.error(t("toastZipError"));
    }
  }, [schema, t]);

  const handleExportNext = useCallback(async () => {
    if (!schema) {
      toast.error(t("toastExportNeedSchema"));
      return;
    }
    try {
      await toast.promise(downloadWebsiteNextZip(schema), {
        loading: t("toastZipNextLoading"),
        success: t("toastZipNextSuccess"),
        error: t("toastZipNextError"),
      });
    } catch {
      toast.error(t("toastZipNextError"));
    }
  }, [schema, t]);

  const handleRefreshDesign = useCallback(async () => {
    if (!schema) {
      return;
    }
    const toastId = toast.loading(t("toastRefreshDesigning"));
    try {
      const response = await fetch(clientApiUrl("/api/website/refresh-design"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schema, locale }),
      });
      const data = (await response.json()) as { schema?: WebsiteSchema; error?: string };
      if (!response.ok || !data.schema) {
        toast.error(data.error ?? t("toastRefreshError"), { id: toastId });
        return;
      }
      applySchema(data.schema);
      toast.success(t("toastRefreshed"), { id: toastId });
    } catch {
      toast.error(t("toastRefreshError"), { id: toastId });
    }
  }, [applySchema, locale, schema, t]);

  const frameTitle = useMemo(() => t("frameTitle"), [t]);

  return (
    <motion.section
      data-onboarding="preview"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
      aria-labelledby="preview-panel-title"
      className={cn("w-full", saasElevatedPanel, "p-4 sm:p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <h2 id="preview-panel-title" className="text-base font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            onClick={() => undoSchema()}
            disabled={!canUndo}
            title={t("undoTitle")}
            whileHover={canUndo ? { scale: 1.03, y: -1 } : undefined}
            whileTap={canUndo ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-45"
          >
            <Undo2 className="size-3.5" aria-hidden />
            {t("undo")}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => redoSchema()}
            disabled={!canRedo}
            title={t("redoTitle")}
            whileHover={canRedo ? { scale: 1.03, y: -1 } : undefined}
            whileTap={canRedo ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-45"
          >
            <Redo2 className="size-3.5" aria-hidden />
            {t("redo")}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => refreshPreview()}
            disabled={!schema || status === "generating"}
            title={t("reloadPreviewTitle")}
            whileHover={schema && status !== "generating" ? { scale: 1.03, y: -1 } : undefined}
            whileTap={schema && status !== "generating" ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-45"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t("reloadPreview")}
          </motion.button>
          <motion.button
            type="button"
            onClick={handleRefreshDesign}
            disabled={!canRefreshDesign}
            whileHover={canRefreshDesign ? { scale: 1.03, y: -1 } : undefined}
            whileTap={canRefreshDesign ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-45"
          >
            <Palette className="size-3.5" aria-hidden />
            {t("refreshDesign")}
          </motion.button>
          <motion.button
            type="button"
            data-onboarding="export"
            onClick={handleExport}
            disabled={!canExport}
            whileHover={canExport ? { scale: 1.03, y: -1 } : undefined}
            whileTap={canExport ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-45"
          >
            <Download className="size-3.5" aria-hidden />
            {t("exportZip")}
          </motion.button>
          <motion.button
            type="button"
            onClick={handleExportNext}
            disabled={!canExport}
            title={t("exportNextTitle")}
            whileHover={canExport ? { scale: 1.03, y: -1 } : undefined}
            whileTap={canExport ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-45"
          >
            <Download className="size-3.5" aria-hidden />
            {t("exportNextZip")}
          </motion.button>
          <StatusBadge status={status} hasSchema={Boolean(schema)} />
        </div>
      </div>

      <motion.div
        layout
        className={cn(
          saasPreviewFrame,
          "bg-muted/10 transition-[box-shadow,border-color] duration-300",
          status === "idle" && "border-border/80",
          status === "generating" && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_24px_56px_-24px_hsl(var(--primary)/0.22)]",
          status === "error" && "border-red-300/80 dark:border-red-900/70",
        )}
      >
        <iframe
          key={previewKey}
          title={frameTitle}
          srcDoc={previewSrcDoc}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="h-[min(70vh,640px)] w-full bg-white text-slate-900"
        />
        {status === "generating" ? <AiThinkingOverlay reduced={reduced} /> : null}
        {status === "error" && errorMessage ? (
          <ErrorOverlay message={errorMessage} onDismiss={clearPreviewError} />
        ) : null}
      </motion.div>
      <p className="mt-2 text-xs text-muted-foreground">{t("footerNote")}</p>
    </motion.section>
  );
}

export const PreviewPanel = memo(PreviewPanelInner);
PreviewPanel.displayName = "PreviewPanel";
