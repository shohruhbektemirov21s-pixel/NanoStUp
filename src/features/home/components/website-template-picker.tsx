"use client";

import { useTranslations } from "next-intl";

import type { WebsiteTemplateKind } from "@/lib/ai/website-generation.types";
import { cn } from "@/lib/utils";

type TemplateOption = {
  value: WebsiteTemplateKind;
  emoji: string;
  titleKey: "templateCardBusinessTitle" | "templateCardCorporateTitle" | "templateCardPortfolioTitle" | "templateCardLandingTitle";
  descriptionKey:
    | "templateCardBusinessDesc"
    | "templateCardCorporateDesc"
    | "templateCardPortfolioDesc"
    | "templateCardLandingDesc";
  recommended?: boolean;
};

/** Kart qiymati = API / store `WebsiteTemplateKind`. */
const TEMPLATE_OPTIONS: readonly TemplateOption[] = [
  {
    value: "balanced",
    emoji: "🟢",
    titleKey: "templateCardBusinessTitle",
    descriptionKey: "templateCardBusinessDesc",
    recommended: true,
  },
  {
    value: "corporate",
    emoji: "🏢",
    titleKey: "templateCardCorporateTitle",
    descriptionKey: "templateCardCorporateDesc",
  },
  {
    value: "portfolio",
    emoji: "🎨",
    titleKey: "templateCardPortfolioTitle",
    descriptionKey: "templateCardPortfolioDesc",
  },
  {
    value: "landing",
    emoji: "🚀",
    titleKey: "templateCardLandingTitle",
    descriptionKey: "templateCardLandingDesc",
  },
] as const;

export type WebsiteTemplatePickerProps = {
  value: WebsiteTemplateKind;
  onChange: (kind: WebsiteTemplateKind) => void;
  disabled?: boolean;
  className?: string;
};

export function WebsiteTemplatePicker({ value, onChange, disabled, className }: WebsiteTemplatePickerProps) {
  const t = useTranslations("Prompt");

  return (
    <fieldset disabled={disabled} className={cn("mb-3 min-w-0 border-0 p-0", className)}>
      <legend id="template-picker-legend" className="mb-1 block text-sm font-semibold tracking-tight text-foreground">
        {t("templatePickerTitle")}
      </legend>
      <p id="template-picker-hint" className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {t("templatePickerHelper")}
      </p>
      <div
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        role="radiogroup"
        aria-labelledby="template-picker-legend"
        aria-describedby="template-picker-hint"
      >
        {TEMPLATE_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex w-full min-h-[4.75rem] items-stretch gap-2.5 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45",
                selected
                  ? "border-primary bg-gradient-to-br from-primary/[0.09] to-indigo-500/[0.06] shadow-[0_0_0_1px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 dark:from-primary/15 dark:to-indigo-500/10"
                  : "border-border/70 bg-white/90 hover:border-primary/40 hover:bg-muted/40 dark:bg-slate-900/60",
              )}
            >
              <span className="pt-0.5 text-xl leading-none select-none" aria-hidden>
                {opt.emoji}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold leading-snug text-foreground sm:text-sm">{t(opt.titleKey)}</span>
                  {opt.recommended ? (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {t("templateRecommendedBadge")}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs leading-snug text-muted-foreground">{t(opt.descriptionKey)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
