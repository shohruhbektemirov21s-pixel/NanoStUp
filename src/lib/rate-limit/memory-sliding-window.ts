type Bucket = { windowStartMs: number; count: number };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 20_000;

function pruneIfNeeded(): void {
  if (buckets.size <= MAX_KEYS) {
    return;
  }
  const cutoff = Date.now() - 3_600_000;
  buckets.forEach((v, k) => {
    if (v.windowStartMs < cutoff) {
      buckets.delete(k);
    }
  });
}

/**
 * Sodda in-memory sliding window (bitta server prosesi). Ko‘p instans — Redis talab qilinadi.
 */
export function checkSlidingWindowRateLimit(input: {
  key: string;
  windowMs: number;
  maxInWindow: number;
}): { ok: true; remaining: number } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const { key, windowMs, maxInWindow } = input;
  pruneIfNeeded();

  let b = buckets.get(key);
  if (!b || now - b.windowStartMs >= windowMs) {
    b = { windowStartMs: now, count: 0 };
    buckets.set(key, b);
  }

  if (b.count >= maxInWindow) {
    const retryAfterMs = Math.max(0, windowMs - (now - b.windowStartMs));
    return { ok: false, retryAfterMs };
  }

  b.count += 1;
  return { ok: true, remaining: maxInWindow - b.count };
}
