"use client";

import { motion } from "framer-motion";
import { Coins, Loader2, SendHorizontal, SkipForward } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { useBuilderSession } from "@/components/builder-session-provider";
import { ComposerWaveTextarea } from "@/components/composer-wave-textarea";
import { GenerationProgressTracker } from "@/features/home/components/generation-progress-tracker";
import { WebsiteTemplatePicker } from "@/features/home/components/website-template-picker";
import type { WebsiteTemplateKind } from "@/lib/ai/website-generation.types";
import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { clientApiUrl } from "@/lib/client-api-url";
import { computeWebsiteGenerationTokenCost } from "@/lib/tokens/website-token-cost";
import { cn } from "@/lib/utils";
import { WEBSITE_PROMPT_MAX_CHARS } from "@/lib/website-generate-body.zod";
import { saasElevatedPanel } from "@/components/ui/saas-surface";
import { Link } from "@/i18n/navigation";
import { useTokenWalletStore } from "@/shared/stores/token-wallet-store";
import { useWebsiteStore, type WebsiteChatMessage } from "@/shared/stores/website-store";

type ApiOk = {
  schema: WebsiteSchema;
  attemptsUsed?: number;
  usedFallback?: boolean;
  warnings?: string[];
  pipeline?: { recoveries?: string[]; sanitization?: { removedControlChars?: number; truncated?: boolean } };
};
type ApiErr = { error?: string; code?: string; retryAfterSec?: number };

function looksLikeRawProviderPayload(message: string): boolean {
  return /quota|Gemini|googleapis|generativelanguage|RESOURCE_EXHAUSTED|HTTP \d{3}|generate_content|^\s*\{/i.test(
    message,
  );
}

function pickAiRouteUserMessage(
  response: Response,
  data: ApiErr & { code?: string },
  t: (key: string) => string,
): string {
  const code = data.code;
  if (code === "PROVIDER_QUOTA") {
    return t("toastProviderBusy");
  }
  if (response.status === 401 || code === "BUILDER_AUTH_REQUIRED") {
    return t("toastApiUnauthorized");
  }
  if (response.status === 429 || code === "RATE_LIMITED") {
    const err = data.error ?? "";
    return err && !looksLikeRawProviderPayload(err) ? err : t("toastRateLimited");
  }
  const err = data.error ?? "";
  if (looksLikeRawProviderPayload(err)) {
    return t("toastProviderBusy");
  }
  return err.length > 0 ? err : t("toastNetwork");
}

function pickNetworkErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof Error && looksLikeRawProviderPayload(error.message)) {
    return t("toastProviderBusy");
  }
  return error instanceof Error ? error.message : t("toastNetwork");
}

type LastGenerateSnapshot = {
  prompt: string;
  priorTurns: { role: "user" | "assistant"; text: string }[];
  templateKind: WebsiteTemplateKind;
};

/** Qisqa matn bilan bir martalik tafsilot bosqichi; undan uzun bo‘lsa — darhol generatsiya. */
const LONG_PROMPT_SINGLE_SHOT = 140;

function matchesFixCommandTriggers(text: string, patternCsv: string): boolean {
  const n = text.trim().toLowerCase();
  const parts = patternCsv
    .split("|")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.some((p) => n.includes(p));
}

const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  index,
}: Readonly<{ message: WebsiteChatMessage; index: number }>) {
  const t = useTranslations("Prompt");
  const isUser = message.role === "user";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, x: isUser ? 8 : -8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28, delay: Math.min(index * 0.04, 0.35) }}
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-sm shadow-sm",
        isUser
          ? "ml-5 border-primary/20 bg-gradient-to-br from-primary/[0.07] to-primary/[0.02] text-foreground"
          : "mr-5 border-border/80 bg-muted/50 text-foreground backdrop-blur-sm",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {isUser ? t("roleUser") : t("roleAssistant")}
      </p>
      <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
    </motion.div>
  );
});

ChatMessageBubble.displayName = "ChatMessageBubble";

function PromptPanelInner() {
  const t = useTranslations("Prompt");
  const tWallet = useTranslations("Wallet");
  const locale = useLocale();
  const {
    composerValue,
    setComposerValue,
    messages,
    status,
    schema,
    detailPreflightPending,
    startGeneration,
    applySchema,
    setPreviewError,
    clearPreviewError,
    addUserMessage,
    addAssistantMessage,
    setDetailPreflightPending,
    injectContextGatherIntro,
    templateKind,
    setTemplateKind,
  } = useWebsiteStore(
    useShallow((s) => ({
      composerValue: s.composerValue,
      setComposerValue: s.setComposerValue,
      messages: s.messages,
      status: s.status,
      schema: s.schema,
      detailPreflightPending: s.detailPreflightPending,
      startGeneration: s.startGeneration,
      applySchema: s.applySchema,
      setPreviewError: s.setPreviewError,
      clearPreviewError: s.clearPreviewError,
      addUserMessage: s.addUserMessage,
      addAssistantMessage: s.addAssistantMessage,
      setDetailPreflightPending: s.setDetailPreflightPending,
      injectContextGatherIntro: s.injectContextGatherIntro,
      templateKind: s.templateKind,
      setTemplateKind: s.setTemplateKind,
    })),
  );

  const { tokenBalance, freeGenerationsRemaining } = useTokenWalletStore(
    useShallow((s) => ({
      tokenBalance: s.tokenBalance,
      freeGenerationsRemaining: s.freeGenerationsRemaining,
    })),
  );

  const { me: builderMe, loading: builderSessionLoading } = useBuilderSession();
  const builderAuth = Boolean(builderMe?.authenticated);
  const [generateRetryOpen, setGenerateRetryOpen] = useState(false);
  const lastGenerateRef = useRef<LastGenerateSnapshot | null>(null);
  const preRegenerateSchemaRef = useRef<WebsiteSchema | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages.length, status]);

  useEffect(() => {
    injectContextGatherIntro(t("contextGatherIntro"));
  }, [injectContextGatherIntro, locale, t]);

  useEffect(() => {
    if (status !== "error") {
      setGenerateRetryOpen(false);
    }
  }, [status]);

  const handleSkipDetail = useCallback(() => {
    setDetailPreflightPending(false);
    toast.message(t("skipDetailToast"));
  }, [setDetailPreflightPending, t]);

  const handleSubmit = useCallback(async () => {
    const prompt = composerValue.trim();
    if (!prompt) {
      toast.error(t("toastEmpty"));
      return;
    }
    if (prompt.length > WEBSITE_PROMPT_MAX_CHARS) {
      toast.error(t("toastPromptTooLong", { max: String(WEBSITE_PROMPT_MAX_CHARS) }));
      return;
    }

    if (!schema && matchesFixCommandTriggers(prompt, t("fixCommandPatterns"))) {
      toast.error(t("toastFixNeedSchema"));
      return;
    }

    const wallet = useTokenWalletStore.getState();

    if (schema) {
      if (!wallet.canAffordFix()) {
        toast.error(t("toastInsufficientTokens"));
        return;
      }
      addUserMessage(prompt);
      setComposerValue("");
      preRegenerateSchemaRef.current = schema;
      startGeneration();
      const toastId = toast.loading(t("toastFixing"));
      try {
        const response = await fetch(clientApiUrl("/api/website/regenerate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ schema, feedback: prompt, locale }),
        });

        let data: ApiOk & ApiErr;
        try {
          data = (await response.json()) as ApiOk & ApiErr;
        } catch {
          const message = t("toastInvalidResponse");
          setPreviewError(message);
          toast.error(message, { id: toastId });
          addAssistantMessage(t("assistantErrorNetwork"));
          return;
        }

        if (!response.ok) {
          const snap = preRegenerateSchemaRef.current;
          if (snap && useWebsiteStore.getState().schema !== snap) {
            applySchema(snap, { skipHistory: true });
          }
          preRegenerateSchemaRef.current = null;
          const message = pickAiRouteUserMessage(response, data as ApiErr & { code?: string }, t);
          setPreviewError(message);
          toast.error(message, { id: toastId });
          addAssistantMessage(t("assistantErrorRetry"));
          return;
        }

        if (!data.schema) {
          const snap = preRegenerateSchemaRef.current;
          if (snap && useWebsiteStore.getState().schema !== snap) {
            applySchema(snap, { skipHistory: true });
          }
          preRegenerateSchemaRef.current = null;
          const message = t("toastSchemaMissing");
          setPreviewError(message);
          toast.error(message, { id: toastId });
          return;
        }

        await useWebsiteStore.getState().finishGenerationProgressAnimation();
        preRegenerateSchemaRef.current = null;
        applySchema(data.schema);
        useTokenWalletStore.getState().finalizeFixCharge();
        toast.success(t("toastFixSuccess"), { id: toastId });
        addAssistantMessage(
          t("assistantFixReady", {
            siteName: data.schema.siteName,
          }),
        );
      } catch (error) {
        const snap = preRegenerateSchemaRef.current;
        if (snap && useWebsiteStore.getState().schema !== snap) {
          applySchema(snap, { skipHistory: true });
        }
        preRegenerateSchemaRef.current = null;
        const message = pickNetworkErrorMessage(error, t);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        addAssistantMessage(t("assistantErrorNetwork"));
      }
      return;
    }

    if (detailPreflightPending && prompt.length < LONG_PROMPT_SINGLE_SHOT) {
      addUserMessage(prompt);
      setComposerValue("");
      addAssistantMessage(t("contextGatherAck"));
      setDetailPreflightPending(false);
      return;
    }

    if (!wallet.canStartFreeGeneration() && !wallet.canStartPaidGeneration()) {
      toast.error(t("toastInsufficientTokens"));
      return;
    }

    setGenerateRetryOpen(false);
    addUserMessage(prompt);
    setComposerValue("");
    startGeneration();

    const priorTurns = useWebsiteStore
      .getState()
      .messages.slice(0, -1)
      .map((m) => ({ role: m.role, text: m.text }));

    const tk = useWebsiteStore.getState().templateKind;
    lastGenerateRef.current = { prompt, priorTurns, templateKind: tk };

    const toastId = toast.loading(t("toastGenerating"));

    try {
      const response = await fetch(clientApiUrl("/api/website/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt,
          locale,
          contextTurns: priorTurns.length > 0 ? priorTurns : undefined,
          templateKind: tk,
        }),
      });

      let data: ApiOk & ApiErr;
      try {
        data = (await response.json()) as ApiOk & ApiErr;
      } catch {
        const message = t("toastInvalidResponse");
        setGenerateRetryOpen(true);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        addAssistantMessage(t("assistantErrorNetwork"));
        return;
      }

      if (!response.ok) {
        const message = pickAiRouteUserMessage(response, data as ApiErr & { code?: string }, t);
        setGenerateRetryOpen(true);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        addAssistantMessage(t("assistantErrorRetry"));
        return;
      }

      if (!data.schema) {
        const message = t("toastSchemaMissing");
        setGenerateRetryOpen(true);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        return;
      }

      lastGenerateRef.current = null;
      await useWebsiteStore.getState().finishGenerationProgressAnimation();
      applySchema(data.schema);
      const cost = computeWebsiteGenerationTokenCost(data.schema);
      useTokenWalletStore.getState().finalizeGenerationCharge(cost);
      setDetailPreflightPending(false);
      toast.success(t("toastPreviewUpdated"), { id: toastId });
      if (data.usedFallback) {
        toast.message(t("assistantFallbackNote"));
      } else if (data.warnings && data.warnings.length > 0) {
        toast.message(data.warnings.slice(0, 3).join(" · "), { duration: 5000 });
      }
      addAssistantMessage(
        t("assistantReady", {
          siteName: data.schema.siteName,
          attempts: String(data.attemptsUsed ?? 1),
        }),
      );
    } catch (error) {
      const message = pickNetworkErrorMessage(error, t);
      setGenerateRetryOpen(true);
      setPreviewError(message);
      toast.error(message, { id: toastId });
      addAssistantMessage(t("assistantErrorNetwork"));
    }
  }, [
    addAssistantMessage,
    addUserMessage,
    applySchema,
    composerValue,
    detailPreflightPending,
    locale,
    schema,
    setComposerValue,
    setDetailPreflightPending,
    setPreviewError,
    startGeneration,
    t,
  ]);

  const handleRetryLastGenerate = useCallback(async () => {
    const snap = lastGenerateRef.current;
    if (!snap) {
      clearPreviewError();
      setGenerateRetryOpen(false);
      return;
    }
    setGenerateRetryOpen(false);
    clearPreviewError();
    const wallet = useTokenWalletStore.getState();
    if (!wallet.canStartFreeGeneration() && !wallet.canStartPaidGeneration()) {
      toast.error(t("toastInsufficientTokens"));
      return;
    }
    startGeneration();
    const toastId = toast.loading(t("toastGenerating"));
    try {
      const response = await fetch(clientApiUrl("/api/website/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: snap.prompt,
          locale,
          contextTurns: snap.priorTurns.length > 0 ? snap.priorTurns : undefined,
          templateKind: snap.templateKind,
        }),
      });
      let data: ApiOk & ApiErr;
      try {
        data = (await response.json()) as ApiOk & ApiErr;
      } catch {
        const message = t("toastInvalidResponse");
        setGenerateRetryOpen(true);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        return;
      }
      if (!response.ok) {
        const message = pickAiRouteUserMessage(response, data as ApiErr & { code?: string }, t);
        setGenerateRetryOpen(true);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        return;
      }
      if (!data.schema) {
        const message = t("toastSchemaMissing");
        setGenerateRetryOpen(true);
        setPreviewError(message);
        toast.error(message, { id: toastId });
        return;
      }
      lastGenerateRef.current = null;
      await useWebsiteStore.getState().finishGenerationProgressAnimation();
      applySchema(data.schema);
      const cost = computeWebsiteGenerationTokenCost(data.schema);
      useTokenWalletStore.getState().finalizeGenerationCharge(cost);
      toast.success(t("toastPreviewUpdated"), { id: toastId });
    } catch (error) {
      const message = pickNetworkErrorMessage(error, t);
      setGenerateRetryOpen(true);
      setPreviewError(message);
      toast.error(message, { id: toastId });
    }
  }, [applySchema, clearPreviewError, locale, setPreviewError, startGeneration, t]);

  useEffect(() => {
    useWebsiteStore.getState().setPreviewRetryAction(() => {
      void handleRetryLastGenerate();
    });
    return () => {
      useWebsiteStore.getState().setPreviewRetryAction(null);
    };
  }, [handleRetryLastGenerate]);

  const busy = status === "generating";
  const canSend = !busy;
  const showDetailHint = !schema && detailPreflightPending;
  const showGenerateRetry = status === "error" && generateRetryOpen && Boolean(lastGenerateRef.current);

  return (
    <motion.section
      data-onboarding="chat"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex h-[min(44rem,calc(100dvh-9rem))] min-h-0 w-full max-w-xl flex-col overflow-hidden sm:h-[min(46rem,calc(100dvh-9rem))]",
        saasElevatedPanel,
      )}
      aria-labelledby="ai-chat-title"
    >
      {!builderSessionLoading && !builderAuth ? (
        <div className="shrink-0 border-b border-border/60 bg-gradient-to-r from-muted/50 to-transparent px-5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <span>{t("guestOptionalHint")} </span>
          <Link href="/builder-login" className="font-semibold text-primary underline-offset-2 hover:underline">
            {t("guestOptionalCta")}
          </Link>
          {" · "}
          <Link href="/builder-signup" className="font-semibold text-primary underline-offset-2 hover:underline">
            {t("guestOptionalSignup")}
          </Link>
        </div>
      ) : null}

      {!schema ? (
        <div className="shrink-0 border-b border-border/60 bg-muted/20 p-4 sm:p-5">
          <WebsiteTemplatePicker value={templateKind} onChange={setTemplateKind} disabled={busy} className="mb-0" />
        </div>
      ) : null}

      <div className="shrink-0 border-b border-border/60 bg-muted/20 p-4 sm:p-5">
        {showDetailHint ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <p className="min-w-0 flex-1 leading-relaxed">{t("contextHintSubtitle")}</p>
            <button
              type="button"
              onClick={handleSkipDetail}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted"
            >
              <SkipForward className="size-3.5" aria-hidden />
              {t("skipDetailGathering")}
            </button>
          </div>
        ) : null}
        <label htmlFor="business-prompt" className="mb-2 block text-sm font-medium text-foreground">
          {schema ? t("labelFix") : t("label")}
        </label>
        <ComposerWaveTextarea
          id="business-prompt"
          name="businessDescription"
          value={composerValue}
          onChange={setComposerValue}
          rows={4}
          maxLength={WEBSITE_PROMPT_MAX_CHARS}
          disabled={busy}
          placeholder={schema ? t("placeholderFix") : t("placeholder")}
        />
        {showGenerateRetry ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/70 bg-red-50/50 px-3 py-2 text-xs dark:border-red-900/50 dark:bg-red-950/30">
            <p className="min-w-0 text-muted-foreground">{t("retryHint")}</p>
            <button
              type="button"
              onClick={() => void handleRetryLastGenerate()}
              disabled={busy}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-45"
            >
              {t("retryAction")}
            </button>
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-busy={busy}
            whileHover={canSend ? { scale: 1.02 } : undefined}
            whileTap={canSend ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <SendHorizontal className="size-4" aria-hidden />}
            {schema ? t("sendFix") : t("send")}
          </motion.button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border/60 bg-gradient-to-r from-muted/40 via-transparent to-muted/30 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="ai-chat-title" className="text-base font-semibold tracking-tight text-foreground">
                {t("title")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{schema ? t("subtitleFixMode") : t("subtitle")}</p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
              title={tWallet("hint")}
            >
              <Coins className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
              <span>{tWallet("freeLeft", { n: freeGenerationsRemaining })}</span>
              <span className="text-muted-foreground">·</span>
              <span>{tWallet("tokens", { n: tokenBalance })}</span>
            </div>
          </div>
        </div>

        <GenerationProgressTracker />

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {!schema ? t("builderFlowHint") : t("emptyState")}
            </p>
          ) : (
            messages.map((m, i) => <ChatMessageBubble key={m.id} message={m} index={i} />)
          )}
        </div>
      </div>
    </motion.section>
  );
}

export const PromptPanel = memo(PromptPanelInner);
PromptPanel.displayName = "PromptPanel";
