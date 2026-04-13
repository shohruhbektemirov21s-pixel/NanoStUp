import "server-only";

import { AiEngineError } from "../errors";

import { logWebsiteAiPipelineWarn } from "./pipeline-logger";

const RETRY_HTTP_STATUS = new Set([408, 429, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type TransientRetryOptions = {
  operationLabel: string;
  /** Jami urinishlar (birinchi chaqiruv + qayta urinishlar) */
  maxAttempts: number;
  baseDelayMs: number;
};

/**
 * Vaqtinchalik provider xatolari (429/502/503) uchun eksponensial backoff.
 */
export async function withTransientHttpRetry<T>(operation: () => Promise<T>, opts: TransientRetryOptions): Promise<T> {
  const { operationLabel, maxAttempts, baseDelayMs } = opts;
  if (maxAttempts < 1) {
    throw new AiEngineError("maxAttempts kamida 1 bo‘lishi kerak", "VALIDATION_FAILED");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (e) {
      lastError = e;
      const status = e instanceof AiEngineError ? e.httpStatus : undefined;
      const retryable = status !== undefined && RETRY_HTTP_STATUS.has(status);
      if (retryable && attempt < maxAttempts - 1) {
        const delay = baseDelayMs * 2 ** attempt;
        logWebsiteAiPipelineWarn({
          event: "transient_http_retry",
          message: operationLabel,
          httpStatus: status,
          attempt: attempt + 1,
          maxAttempts,
        });
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}
