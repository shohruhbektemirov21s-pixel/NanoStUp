import { cn } from "@/lib/utils";

import type { BuilderSectionTheme } from "../types/section.types";

export function sectionShell(theme: BuilderSectionTheme, className?: string): string {
  return cn(
    "relative overflow-hidden",
    theme === "light" && "bg-gradient-to-b from-white via-slate-50/80 to-white text-slate-900",
    theme === "dark" && "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50",
    className,
  );
}

export function mutedText(theme: BuilderSectionTheme): string {
  return theme === "light" ? "text-slate-600" : "text-slate-300";
}

export function cardSurface(theme: BuilderSectionTheme): string {
  return cn(
    "rounded-2xl border shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md",
    theme === "light" && "border-slate-200/80 bg-white/90",
    theme === "dark" && "border-slate-800/80 bg-slate-900/60",
  );
}

export function focusRing(theme: BuilderSectionTheme): string {
  return cn(
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    theme === "light" && "focus-visible:ring-slate-900 focus-visible:ring-offset-white",
    theme === "dark" && "focus-visible:ring-slate-100 focus-visible:ring-offset-slate-950",
  );
}
