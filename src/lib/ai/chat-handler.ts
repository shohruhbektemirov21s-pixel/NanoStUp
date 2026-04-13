import "server-only";

import { AiEngineError } from "./errors";

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

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new AiEngineError(
      "GOOGLE_GENERATIVE_AI_API_KEY (yoki GEMINI_API_KEY) topilmadi — Gemini uchun .env da qo‘ying.",
      "MISSING_API_KEY",
    );
  }
  const baseUrl = (process.env.GOOGLE_GENERATIVE_AI_BASE_URL?.trim() || DEFAULT_GOOGLE_GENAI_BASE).replace(/\/$/, "");
  const model = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.0-flash";
  return { provider: "google", apiKey, baseUrl, model };
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

/**
 * OpenAI, DeepSeek yoki Google Gemini (generateContent) orqali chat completion.
 */
export async function postChatCompletion(input: PostChatCompletionInput): Promise<string> {
  if (input.config.provider === "google") {
    return postGoogleGeminiChat(input);
  }
  return postOpenAiCompatibleChat(input);
}
