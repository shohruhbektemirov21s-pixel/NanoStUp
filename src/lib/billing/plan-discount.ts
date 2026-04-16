/** Obuna muddatiga qarab narx koeffitsienti (veb pricing + Payme checkout bir xil). */
export function planBillingDiscountFactor(months: number): number {
  if (months >= 12) return 0.78;
  if (months >= 9) return 0.82;
  if (months >= 6) return 0.88;
  if (months >= 3) return 0.93;
  return 1;
}
