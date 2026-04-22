/**
 * UZS narxlarni formatlash yordamchilari.
 * Backend narxlari decimal string sifatida keladi (masalan "199000").
 * Biz ularni "199 000 so'm" / "199 000 сум" / "199 000 UZS" ko'rinishida ko'rsatamiz.
 */

/** Raqamni mingliklarni bo'sh joy bilan ajratib formatlaydi: 199000 → "199 000" */
export function formatUzsNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('uz-UZ').replace(/,/g, ' ').replace(/\u00A0/g, ' ');
}

/**
 * To'liq UZS yorlig'i: `199 000 so'm` (locale'ga qarab suffix).
 * Bepul (0) bo'lsa — `freeLabel` qaytaradi.
 */
export function formatUzsPrice(
  price: string | number,
  currencyLabel: string,
  freeLabel: string,
): string {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (!Number.isFinite(n) || n <= 0) return freeLabel;
  return `${formatUzsNumber(n)} ${currencyLabel}`;
}
