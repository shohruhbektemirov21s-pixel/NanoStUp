import "server-only";

import { AiEngineError } from "./errors";

const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1";
const DEFAULT_WHISPER_MODEL = "whisper-1";

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const sliced = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return sliced as ArrayBuffer;
}

type WhisperSuccess = { text?: string };
type WhisperErrorBody = { error?: { message?: string } };

/**
 * OpenAI Whisper API — Telegram ovozli xabarlar (ogg/opus) uchun.
 * Chat uchun DeepSeek ishlatilsa ham, Whisper uchun `OPENAI_API_KEY` kerak.
 */
export async function transcribeAudioWithWhisper(input: {
  buffer: Buffer;
  fileName: string;
  signal?: AbortSignal;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiEngineError(
      "Ovozni matnga aylantirish uchun OPENAI_API_KEY sozlanishi kerak.",
      "MISSING_API_KEY",
    );
  }

  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE).replace(/\/$/, "");
  const model = process.env.WHISPER_MODEL?.trim() || DEFAULT_WHISPER_MODEL;
  const url = `${baseUrl}/audio/transcriptions`;

  const binary = bufferToArrayBuffer(input.buffer);
  const form = new FormData();
  form.append("model", model);
  const file =
    typeof File !== "undefined"
      ? new File([binary], input.fileName, { type: "application/ogg" })
      : new Blob([binary], { type: "application/ogg" });
  form.append("file", file, input.fileName);

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: input.signal,
  });

  const raw = await response.text();
  let parsed: WhisperSuccess & WhisperErrorBody;
  try {
    parsed = JSON.parse(raw) as WhisperSuccess & WhisperErrorBody;
  } catch {
    throw new AiEngineError(
      `Whisper javobi JSON emas (HTTP ${response.status}).`,
      "TRANSCRIPTION_FAILED",
      raw.slice(0, 400),
    );
  }

  if (!response.ok) {
    const msg = parsed.error?.message ?? raw.slice(0, 300);
    throw new AiEngineError(`Whisper xatosi (HTTP ${response.status}): ${msg}`, "TRANSCRIPTION_FAILED", parsed);
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) {
    throw new AiEngineError("Whisper bo‘sh matn qaytardi.", "TRANSCRIPTION_FAILED", parsed);
  }

  return text;
}
