type GenerationTimeMessages = {
  timeLeftMixed: (v: { m: number; s: number }) => string;
  timeLeftMinutes: (v: { m: number }) => string;
  timeLeftSeconds: (v: { s: number }) => string;
  timeLeftAlmost: () => string;
};

export function formatApproximateTimeLeft(totalSeconds: number, t: GenerationTimeMessages): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  if (sec <= 0) {
    return t.timeLeftAlmost();
  }
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) {
    return t.timeLeftSeconds({ s });
  }
  if (s === 0) {
    return t.timeLeftMinutes({ m });
  }
  return t.timeLeftMixed({ m, s });
}
