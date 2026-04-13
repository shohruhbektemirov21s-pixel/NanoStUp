/**
 * 5 bosqich — og‘irliklar jami 1; jami vaqt `totalBudget` (masalan 90 s) bilan masshtablanadi.
 */
export const GENERATION_DEFAULT_TOTAL_SECONDS = 90;

/** Bosqichlarning nisbiy og‘irliklari (jami 120 bo‘lgan klassik taqsimotdan) */
const PHASE_WEIGHTS = [18, 30, 24, 28, 20].map((s) => s / 120);

export const GENERATION_PHASE_KEYS = ["analysis", "schema", "design", "content", "assembly"] as const;

export type GenerationPhaseKey = (typeof GENERATION_PHASE_KEYS)[number];

export function getPhaseBudgetEnds(totalBudget: number): number[] {
  const ends: number[] = [];
  let acc = 0;
  for (const w of PHASE_WEIGHTS) {
    acc += w * totalBudget;
    ends.push(acc);
  }
  return ends;
}

/** AI kutilganda progress chizig‘i shu foizgacha yetadi (tugash animatsiyasi uchun). */
const WAITING_PROGRESS_CAP = 0.92;

export type WaitingGenerationState = {
  currentStep: number;
  progressPercent: number;
  estimatedTimeLeft: number;
};

/**
 * `elapsedSec` — boshlanishdan beri sekundlar; `totalBudget` — taxminiy jami vaqt (AI belgilagan).
 */
export function computeWaitingGenerationState(
  elapsedSec: number,
  totalBudget: number = GENERATION_DEFAULT_TOTAL_SECONDS,
): WaitingGenerationState {
  const elapsed = Math.max(0, elapsedSec);
  const budget = Math.max(30, totalBudget);
  const ends = getPhaseBudgetEnds(budget);

  let currentStep = GENERATION_PHASE_KEYS.length - 1;
  for (let i = 0; i < ends.length; i += 1) {
    if (elapsed < ends[i]) {
      currentStep = i;
      break;
    }
  }

  const linear = Math.min(1, elapsed / budget);
  const progressPercent = Math.min(WAITING_PROGRESS_CAP * 100, linear * WAITING_PROGRESS_CAP * 100);

  const estimatedTimeLeft = Math.max(0, Math.ceil(budget - elapsed));

  return { currentStep, progressPercent, estimatedTimeLeft };
}

/** Oldingi ko‘rinishdan ideal holatga silliq yaqinlash (catch-up). */
export function lerpGenerationDisplay(
  prev: { progressPercent: number; estimatedTimeLeft: number },
  ideal: WaitingGenerationState,
  progressBlend = 0.42,
  timeBlend = 0.55,
): WaitingGenerationState {
  const progressPercent =
    prev.progressPercent + (ideal.progressPercent - prev.progressPercent) * progressBlend;
  const estimatedTimeLeft = Math.round(
    prev.estimatedTimeLeft + (ideal.estimatedTimeLeft - prev.estimatedTimeLeft) * timeBlend,
  );
  return {
    currentStep: ideal.currentStep,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    estimatedTimeLeft: Math.max(0, estimatedTimeLeft),
  };
}
