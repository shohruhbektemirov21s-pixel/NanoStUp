export type PreviewPlaceholderLabels = {
  badge: string;
  title: string;
  lead: string;
};

/** SSR / store init — inglizcha nutqiy neytral matn (keyin client tilga yangilanadi). */
export const DEFAULT_PREVIEW_PLACEHOLDER_LABELS: PreviewPlaceholderLabels = {
  badge: "Preview",
  title: "Website template",
  lead: "This area updates after the AI response — isolated from the main app styles.",
};
