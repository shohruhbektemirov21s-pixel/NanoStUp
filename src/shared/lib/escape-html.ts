/**
 * iframe `srcDoc` ichida matnni xavfsiz chiqarish uchun minimal escape.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
