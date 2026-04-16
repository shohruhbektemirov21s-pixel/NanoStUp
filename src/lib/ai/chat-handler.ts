import "server-only";

import { AiEngineError } from "./errors";
import { withTransientHttpRetry } from "./pipeline/transient-retry";

export type AiProviderId = "openai" | "deepseek" | "google";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ResolvedAiClientConfig = {
  provider: AiProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: { message?: string };
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
};

const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const DEFAULT_GOOGLE_GENAI_BASE = "https://generativelanguage.googleapis.com";
/** Tez va arzon Flash sinf (1.5 Pro o‘rniga). Eski IDlar `normalizeGoogleGenAiModelId` orqali shu oilaga aylanadi. */
const DEFAULT_GOOGLE_GENAI_MODEL = "gemini-2.0-flash";

const GEMINI_EXTRA_KEY_SLOTS = 32;
const GOOGLE_HTTP_MAX_ATTEMPTS = 3;
const GOOGLE_HTTP_BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Bir nechta kalit: standart env + `GEMINI_KEY_1` … `GEMINI_KEY_32` (takrorlarsiz tartibda).
 */
export function collectGeminiApiKeys(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | undefined) => {
    const t = raw?.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };
  push(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  push(process.env.GEMINI_API_KEY);
  push(process.env.GOOGLE_API_KEY);
  for (let i = 1; i <= GEMINI_EXTRA_KEY_SLOTS; i += 1) {
    push(process.env[`GEMINI_KEY_${i}`]);
  }
  return out;
}

/** v1beta da eski `gemini-1.5-*` IDlari 404 berishi mumkin — barqaror ID ga aylantiramiz. */
export function normalizeGoogleGenAiModelId(raw: string): string {
  const id = raw.replace(/^models\//, "").trim().toLowerCase();
  const legacyToCurrent: Record<string, string> = {
    "gemini-1.5-flash": DEFAULT_GOOGLE_GENAI_MODEL,
    "gemini-1.5-flash-8b": DEFAULT_GOOGLE_GENAI_MODEL,
    "gemini-1.5-flash-latest": DEFAULT_GOOGLE_GENAI_MODEL,
    "gemini-1.5-pro": DEFAULT_GOOGLE_GENAI_MODEL,
    "gemini-1.5-pro-latest": DEFAULT_GOOGLE_GENAI_MODEL,
    "gemini-pro": DEFAULT_GOOGLE_GENAI_MODEL,
  };
  return legacyToCurrent[id] ?? raw.trim();
}

export function resolveAiClientConfig(): ResolvedAiClientConfig {
  const providerRaw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (providerRaw !== "openai" && providerRaw !== "deepseek" && providerRaw !== "google") {
    throw new AiEngineError(
      "AI_PROVIDER `openai`, `deepseek` yoki `google` (Gemini) bo‘lishi kerak.",
      "MISSING_PROVIDER",
    );
  }

  if (providerRaw === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new AiEngineError("OPENAI_API_KEY topilmadi.", "MISSING_API_KEY");
    }
    const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE).replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    return { provider: "openai", apiKey, baseUrl, model };
  }

  if (providerRaw === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      throw new AiEngineError("DEEPSEEK_API_KEY topilmadi.", "MISSING_API_KEY");
    }
    const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_DEEPSEEK_BASE).replace(/\/$/, "");
    const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
    return { provider: "deepseek", apiKey, baseUrl, model };
  }

  const keys = collectGeminiApiKeys();
  if (keys.length === 0) {
    throw new AiEngineError(
      "GOOGLE_GENERATIVE_AI_API_KEY (yoki GEMINI_API_KEY / GEMINI_KEY_1…) topilmadi — Gemini uchun .env da qo‘ying.",
      "MISSING_API_KEY",
    );
  }
  const baseUrl = (process.env.GOOGLE_GENERATIVE_AI_BASE_URL?.trim() || DEFAULT_GOOGLE_GENAI_BASE).replace(/\/$/, "");
  const envModel = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim();
  const model = normalizeGoogleGenAiModelId(envModel && envModel.length > 0 ? envModel : DEFAULT_GOOGLE_GENAI_MODEL);
  return { provider: "google", apiKey: keys[0], baseUrl, model };
}

export type PostChatCompletionInput = {
  config: ResolvedAiClientConfig;
  messages: ChatMessage[];
  temperature?: number;
  /** OpenAI / DeepSeek / Gemini JSON rejimi */
  jsonMode?: boolean;
  signal?: AbortSignal;
};

async function postOpenAiCompatibleChat(input: PostChatCompletionInput): Promise<string> {
  const { config, messages, temperature = 0.35, jsonMode = true, signal } = input;
  const url = `${config.baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  let parsed: OpenAiChatCompletionResponse;
  try {
    parsed = JSON.parse(text) as OpenAiChatCompletionResponse;
  } catch {
    throw new AiEngineError(
      `API javobi JSON emas (HTTP ${response.status})`,
      "HTTP_ERROR",
      text.slice(0, 500),
      response.status,
    );
  }

  if (!response.ok) {
    const msg = parsed.error?.message ?? text.slice(0, 400);
    throw new AiEngineError(
      `Chat completions xatosi (HTTP ${response.status}): ${msg}`,
      "HTTP_ERROR",
      parsed,
      response.status,
    );
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new AiEngineError("Model bo‘sh javob qaytardi.", "EMPTY_CONTENT", parsed);
  }

  return content;
}

async function postGoogleGeminiChat(input: PostChatCompletionInput): Promise<string> {
  const { config, messages, temperature = 0.35, jsonMode = true, signal } = input;

  const systemChunks: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemChunks.push(m.content);
    } else if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else {
      contents.push({ role: "model", parts: [{ text: m.content }] });
    }
  }

  const generationConfig: Record<string, unknown> = { temperature };
  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (systemChunks.length > 0) {
    body.systemInstruction = { parts: [{ text: systemChunks.join("\n\n") }] };
  }

  const modelId = config.model.replace(/^models\//, "");
  const url = `${config.baseUrl}/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const rawText = await response.text();
  let parsed: GeminiGenerateResponse;
  try {
    parsed = JSON.parse(rawText) as GeminiGenerateResponse;
  } catch {
    throw new AiEngineError(
      `Gemini javobi JSON emas (HTTP ${response.status})`,
      "HTTP_ERROR",
      rawText.slice(0, 500),
      response.status,
    );
  }

  if (!response.ok) {
    const msg = parsed.error?.message ?? rawText.slice(0, 400);
    throw new AiEngineError(`Gemini xatosi (HTTP ${response.status}): ${msg}`, "HTTP_ERROR", parsed, response.status);
  }

  const candidate = parsed.candidates?.[0];
  const reason = candidate?.finishReason;
  if (reason && reason !== "STOP" && reason !== "MAX_TOKENS") {
    throw new AiEngineError(`Gemini javob tugashi: ${reason}`, "HTTP_ERROR", parsed);
  }

  const parts = candidate?.content?.parts;
  const text = parts?.map((p) => p.text ?? "").join("") ?? "";
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new AiEngineError("Gemini bo‘sh javob qaytardi.", "EMPTY_CONTENT", parsed);
  }

  return text;
}

async function postGoogleGeminiCompletionResilient(input: PostChatCompletionInput): Promise<string> {
  const keys = collectGeminiApiKeys();
  if (keys.length === 0) {
    throw new AiEngineError(
      "GOOGLE_GENERATIVE_AI_API_KEY (yoki GEMINI_API_KEY / GEMINI_KEY_1…) topilmadi — Gemini uchun .env da qo‘ying.",
      "MISSING_API_KEY",
    );
  }

  let lastError: unknown;
  for (let keyIdx = 0; keyIdx < keys.length; keyIdx += 1) {
    if (keyIdx > 0) {
      await sleep(GOOGLE_HTTP_BASE_DELAY_MS * 2 ** (keyIdx - 1));
    }
    const cfg = { ...input.config, apiKey: keys[keyIdx] };
    try {
      return await withTransientHttpRetry(
        () => postGoogleGeminiChat({ ...input, config: cfg }),
        {
          operationLabel: "postGoogleGeminiChat",
          maxAttempts: GOOGLE_HTTP_MAX_ATTEMPTS,
          baseDelayMs: GOOGLE_HTTP_BASE_DELAY_MS,
        },
      );
    } catch (e) {
      lastError = e;
      const status = e instanceof AiEngineError ? e.httpStatus : undefined;
      if (status === 429 && keyIdx < keys.length - 1) {
        continue;
      }
      throw e;
    }
  }

  throw new AiEngineError("Gemini javob bermadi.", "HTTP_ERROR", lastError, 429);
}

/**
 * OpenAI, DeepSeek yoki Google Gemini (generateContent) orqali chat completion.
 */
export async function postChatCompletion(input: PostChatCompletionInput): Promise<string> {
  if (input.config.provider === "google") {
    return postGoogleGeminiCompletionResilient(input);
  }
  return postOpenAiCompatibleChat(input);
}
