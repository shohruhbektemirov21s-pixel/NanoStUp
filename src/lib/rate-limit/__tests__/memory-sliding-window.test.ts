import { describe, expect, it } from "vitest";

import { checkSlidingWindowRateLimit } from "../memory-sliding-window";

describe("checkSlidingWindowRateLimit", () => {
  it("allows up to maxInWindow within window", () => {
    const key = `test-${Math.random()}`;
    const w = 10_000;
    expect(checkSlidingWindowRateLimit({ key, windowMs: w, maxInWindow: 2 }).ok).toBe(true);
    expect(checkSlidingWindowRateLimit({ key, windowMs: w, maxInWindow: 2 }).ok).toBe(true);
    const third = checkSlidingWindowRateLimit({ key, windowMs: w, maxInWindow: 2 });
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.retryAfterMs).toBeGreaterThan(0);
    }
  });
});
