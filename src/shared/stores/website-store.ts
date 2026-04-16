import { create } from "zustand";

import type { WebsiteTemplateKind } from "@/lib/ai/website-generation.types";
import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { buildPlaceholderPreviewSrcDoc, buildPreviewSrcDoc } from "@/shared/lib/build-preview-srcdoc";
import {
  GENERATION_DEFAULT_TOTAL_SECONDS,
  computeWaitingGenerationState,
  lerpGenerationDisplay,
} from "@/shared/lib/generation-progress";
import { DEFAULT_PREVIEW_PLACEHOLDER_LABELS, type PreviewPlaceholderLabels } from "@/shared/lib/preview-placeholder-defaults";

export type WebsitePreviewStatus = "idle" | "generating" | "error";

export type WebsiteChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const FALLBACK_PREVIEW_SRC = `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Preview</title></head><body style="margin:0;font-family:system-ui,sans-serif;display:grid;min-height:100vh;place-items:center;background:#f8fafc;color:#64748b">Preview…</body></html>`;

function createInitialPreviewSrcDoc(): string {
  try {
    const doc = buildPlaceholderPreviewSrcDoc(DEFAULT_PREVIEW_PLACEHOLDER_LABELS);
    return doc.length > 80 ? doc : FALLBACK_PREVIEW_SRC;
  } catch {
    return FALLBACK_PREVIEW_SRC;
  }
}

const initialSrcDoc = createInitialPreviewSrcDoc();

/** Brauzer draft (localStorage) kaliti */
export const WEBSITE_BUILDER_DRAFT_STORAGE_KEY = "ai-website-builder.draft.v1";

const MAX_SCHEMA_HISTORY = 40;

const initialGenerationUi = {
  currentStep: 0,
  estimatedTimeLeft: 0,
  progressPercent: 0,
  generationStartedAt: null as number | null,
  generationUiFinishing: false,
  generationTotalBudgetSeconds: GENERATION_DEFAULT_TOTAL_SECONDS,
};

type WebsiteStoreState = {
  status: WebsitePreviewStatus;
  composerValue: string;
  schema: WebsiteSchema | null;
  previewSrcDoc: string;
  previewKey: string;
  errorMessage: string | null;
  messages: WebsiteChatMessage[];
  /** 0–4: bosqichlar, 5: yakun */
  currentStep: number;
  /** Qolgan vaqt (sekund, soniyalik yangilanadi) */
  estimatedTimeLeft: number;
  /** 0–100 progress bar */
  progressPercent: number;
  generationStartedAt: number | null;
  generationUiFinishing: boolean;
  /** AI taxminiy jami vaqt (sekund) */
  generationTotalBudgetSeconds: number;
  /** Birinchi bosqich: qisqa tafsilot yig‘ish (AI so‘rovi). */
  detailPreflightPending: boolean;
  /** Boshlang‘ich kontekst xabari yuborilgani. */
  contextGatherIntroSent: boolean;
  /** Undo uchun avvalgi sxemalar */
  historyPast: WebsiteSchema[];
  /** Redo navbati */
  historyFuture: WebsiteSchema[];
  /** Keyingi `/api/website/generate` uchun shablon */
  templateKind: WebsiteTemplateKind;
  /** Preview xato overlay uchun oxirgi generatsiyani qayta ishlatish */
  previewRetryAction: (() => void) | null;
};

type WebsiteStoreActions = {
  setComposerValue: (value: string) => void;
  setStatus: (status: WebsitePreviewStatus) => void;
  startGeneration: (options?: { totalBudgetSeconds?: number }) => void;
  syncGenerationProgress: (payload: { currentStep: number; estimatedTimeLeft: number; progressPercent: number }) => void;
  finishGenerationProgressAnimation: () => Promise<void>;
  resetGenerationProgressUi: () => void;
  applySchema: (schema: WebsiteSchema, options?: { skipHistory?: boolean }) => void;
  undoSchema: () => void;
  redoSchema: () => void;
  refreshPreview: () => void;
  setTemplateKind: (kind: WebsiteTemplateKind) => void;
  setPreviewError: (message: string) => void;
  clearPreviewError: () => void;
  setPreviewRetryAction: (fn: (() => void) | null) => void;
  addUserMessage: (text: string) => void;
  addAssistantMessage: (text: string) => void;
  resetSession: () => void;
  setPlaceholderLabels: (labels: PreviewPlaceholderLabels) => void;
  setDetailPreflightPending: (value: boolean) => void;
  injectContextGatherIntro: (text: string) => void;
};

export type WebsiteStore = WebsiteStoreState & WebsiteStoreActions;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export const useWebsiteStore = create<WebsiteStore>((set, get) => ({
  status: "idle",
  composerValue: "",
  schema: null,
  previewSrcDoc: initialSrcDoc,
  previewKey: "initial",
  errorMessage: null,
  messages: [],
  ...initialGenerationUi,
  detailPreflightPending: true,
  contextGatherIntroSent: false,
  historyPast: [],
  historyFuture: [],
  templateKind: "balanced",
  previewRetryAction: null,

  setComposerValue: (value) => set({ composerValue: value }),

  setTemplateKind: (kind) => set({ templateKind: kind }),

  setDetailPreflightPending: (value) => set({ detailPreflightPending: value }),

  injectContextGatherIntro: (text) =>
    set((s) => {
      if (s.contextGatherIntroSent || s.messages.length > 0) {
        return s;
      }
      return {
        contextGatherIntroSent: true,
        messages: [{ id: createId(), role: "assistant", text, createdAt: Date.now() }],
      };
    }),

  setStatus: (status) => set({ status }),

  startGeneration: (options) => {
    const totalBudgetSeconds =
      typeof options?.totalBudgetSeconds === "number" && options.totalBudgetSeconds >= 30
        ? Math.round(options.totalBudgetSeconds)
        : GENERATION_DEFAULT_TOTAL_SECONDS;
    set({
      status: "generating",
      errorMessage: null,
      currentStep: 0,
      estimatedTimeLeft: totalBudgetSeconds,
      progressPercent: 0,
      generationStartedAt: Date.now(),
      generationUiFinishing: false,
      generationTotalBudgetSeconds: totalBudgetSeconds,
    });
  },

  syncGenerationProgress: (payload) => set(payload),

  finishGenerationProgressAnimation: () =>
    new Promise<void>((resolve) => {
      const started = Date.now();
      const durationMs = 1000;
      const from = get().progressPercent;
      const fromStep = get().currentStep;
      const budget = get().generationTotalBudgetSeconds;
      set({ generationUiFinishing: true });

      const frame = () => {
        const raw = (Date.now() - started) / durationMs;
        const t = Math.min(1, raw);
        const eased = easeOutCubic(t);
        const progressPercent = from + (100 - from) * eased;
        const estimatedTimeLeft = Math.max(0, Math.round(budget * (1 - eased)));
        const currentStep = t >= 1 ? 5 : t > 0.62 ? 4 : fromStep;
        if (t < 1) {
          set({ progressPercent, estimatedTimeLeft, currentStep });
          requestAnimationFrame(frame);
        } else {
          set({ progressPercent: 100, estimatedTimeLeft: 0, currentStep: 5, generationUiFinishing: false });
          resolve();
        }
      };
      requestAnimationFrame(frame);
    }),

  resetGenerationProgressUi: () => set({ ...initialGenerationUi }),

  applySchema: (schema, options) =>
    set((s) => {
      const skipHistory = options?.skipHistory === true;
      let historyPast = s.historyPast;
      let historyFuture = s.historyFuture;
      if (!skipHistory && s.schema) {
        historyPast = [...s.historyPast, s.schema].slice(-MAX_SCHEMA_HISTORY);
        historyFuture = [];
      }
      return {
        schema,
        previewSrcDoc: buildPreviewSrcDoc(schema),
        previewKey: createId(),
        status: "idle",
        errorMessage: null,
        previewRetryAction: null,
        ...initialGenerationUi,
        historyPast,
        historyFuture,
      };
    }),

  undoSchema: () => {
    const s = get();
    if (!s.schema || s.historyPast.length === 0) {
      return;
    }
    const prev = s.historyPast[s.historyPast.length - 1];
    set({
      schema: prev,
      previewSrcDoc: buildPreviewSrcDoc(prev),
      previewKey: createId(),
      historyPast: s.historyPast.slice(0, -1),
      historyFuture: [s.schema, ...s.historyFuture].slice(0, MAX_SCHEMA_HISTORY),
      status: "idle",
      errorMessage: null,
      ...initialGenerationUi,
    });
  },

  redoSchema: () => {
    const s = get();
    if (!s.schema || s.historyFuture.length === 0) {
      return;
    }
    const next = s.historyFuture[0];
    set({
      schema: next,
      previewSrcDoc: buildPreviewSrcDoc(next),
      previewKey: createId(),
      historyPast: [...s.historyPast, s.schema].slice(-MAX_SCHEMA_HISTORY),
      historyFuture: s.historyFuture.slice(1),
      status: "idle",
      errorMessage: null,
      ...initialGenerationUi,
    });
  },

  refreshPreview: () => {
    const s = get();
    if (!s.schema) {
      return;
    }
    set({
      previewSrcDoc: buildPreviewSrcDoc(s.schema),
      previewKey: createId(),
    });
  },

  setPreviewError: (message) =>
    set({
      status: "error",
      errorMessage: message,
      ...initialGenerationUi,
    }),

  clearPreviewError: () =>
    set({
      status: "idle",
      errorMessage: null,
      previewRetryAction: null,
      ...initialGenerationUi,
    }),

  setPreviewRetryAction: (fn) => set({ previewRetryAction: fn }),

  addUserMessage: (text) =>
    set((state) => ({
      messages: [...state.messages, { id: createId(), role: "user", text, createdAt: Date.now() }],
    })),

  addAssistantMessage: (text) =>
    set((state) => ({
      messages: [...state.messages, { id: createId(), role: "assistant", text, createdAt: Date.now() }],
    })),

  resetSession: () => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(WEBSITE_BUILDER_DRAFT_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    set({
      messages: [],
      schema: null,
      previewSrcDoc: createInitialPreviewSrcDoc(),
      previewKey: createId(),
      status: "idle",
      errorMessage: null,
      previewRetryAction: null,
      composerValue: "",
      ...initialGenerationUi,
      detailPreflightPending: true,
      contextGatherIntroSent: false,
      historyPast: [],
      historyFuture: [],
      templateKind: "balanced",
    });
  },

  setPlaceholderLabels: (labels) =>
    set((state) => {
      if (state.schema) {
        return state;
      }
      return {
        previewSrcDoc: buildPlaceholderPreviewSrcDoc(labels),
        previewKey: createId(),
      };
    }),
}));

export function computeGenerationTickPayload(
  startedAt: number,
  totalBudget: number,
  prev: { progressPercent: number; estimatedTimeLeft: number },
): { currentStep: number; estimatedTimeLeft: number; progressPercent: number } {
  const elapsed = (Date.now() - startedAt) / 1000;
  const ideal = computeWaitingGenerationState(elapsed, totalBudget);
  return lerpGenerationDisplay(prev, ideal, 0.45, 1);
}
