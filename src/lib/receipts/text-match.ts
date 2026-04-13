/** Chek matnida telefon / summa / izoh kodi qidirish (OCR xatoliklariga chidamli). */

export function normalizeDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function textContainsMsisdn(fullText: string, expectedDigits: string): boolean {
  const exp = normalizeDigits(expectedDigits);
  if (exp.length < 9) {
    return false;
  }
  const t = normalizeDigits(fullText);
  if (t.includes(exp)) {
    return true;
  }
  const tail = exp.slice(-9);
  return t.includes(tail);
}

export function textContainsAmountUzs(fullText: string, amountUzs: number): boolean {
  if (!Number.isFinite(amountUzs) || amountUzs <= 0) {
    return false;
  }
  const t = normalizeDigits(fullText);
  const a = String(Math.round(amountUzs));
  if (t.includes(a)) {
    return true;
  }
  const spaced = a.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (normalizeDigits(spaced) === a && fullText.replace(/\s/g, "").includes(spaced.replace(/\s/g, ""))) {
    return true;
  }
  return false;
}

export function textContainsPaymentCode(fullText: string, code: string): boolean {
  const c = code.trim();
  if (!c) {
    return false;
  }
  return fullText.toLowerCase().includes(c.toLowerCase());
}
