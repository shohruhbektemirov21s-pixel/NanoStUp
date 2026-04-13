import { describe, expect, it } from "vitest";

import {
  GENERATION_DEFAULT_TOTAL_SECONDS,
  computeWaitingGenerationState,
  getPhaseBudgetEnds,
} from "../generation-progress";

describe("generation progress", () => {
  it("bosqichlar yig‘indisi budjetga teng", () => {
    const ends = getPhaseBudgetEnds(GENERATION_DEFAULT_TOTAL_SECONDS);
    expect(ends[ends.length - 1]).toBeCloseTo(GENERATION_DEFAULT_TOTAL_SECONDS, 5);
  });

  it("boshlanganda 0-bosqich va to‘liq taxminiy vaqt", () => {
    const s = computeWaitingGenerationState(0, 90);
    expect(s.currentStep).toBe(0);
    expect(s.estimatedTimeLeft).toBe(90);
    expect(s.progressPercent).toBe(0);
  });

  it("vaqt o‘tishi bilan bosqich va progress o‘sadi", () => {
    const s = computeWaitingGenerationState(20, 90);
    expect(s.currentStep).toBeGreaterThanOrEqual(1);
    expect(s.progressPercent).toBeGreaterThan(0);
    expect(s.estimatedTimeLeft).toBeLessThanOrEqual(90);
  });
});
