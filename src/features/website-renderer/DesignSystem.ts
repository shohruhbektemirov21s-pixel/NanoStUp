import { DesignDNA } from "../../lib/schema/blueprint";

export function getStyleConfig(dna: DesignDNA) {
  const styles = {
    container: "mx-auto px-4 md:px-8",
    section: "py-16 md:py-24 overflow-hidden",
    heading: "font-bold tracking-tight",
    subheading: "text-muted-foreground",
    card: "transition-all duration-300",
    button: "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
  };

  // 1. Typography Mood
  const typographyMap: Record<DesignDNA["typographyMood"], string> = {
    "clean-sans": "font-sans",
    "premium-serif": "font-serif",
    "modern-tech": "font-mono tracking-tighter",
    "friendly-rounded": "font-sans rounded-xl", // assuming rounded fonts are handled in tailwind config
  };

  // 2. Color Mode (Simplified mapping to CSS variables or Tailwind classes)
  const colorMap: Record<DesignDNA["colorMode"], string> = {
    "neutral-light": "bg-white text-slate-900",
    "dark-premium": "bg-slate-950 text-slate-50",
    "gradient-vibrant": "bg-white text-slate-900",
    "soft-pastel": "bg-rose-50/30 text-slate-800",
    "monochrome-bold": "bg-white text-black",
  };

  // 3. Card Style
  const cardMap: Record<DesignDNA["cardStyle"], string> = {
    soft: "rounded-3xl border border-black/5 bg-white/50 backdrop-blur-sm shadow-sm",
    sharp: "rounded-none border-2 border-current",
    glass: "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl",
    bordered: "rounded-xl border border-slate-200 shadow-none",
    elevated: "rounded-2xl bg-white shadow-xl hover:shadow-2xl translate-y-0 hover:-translate-y-1",
  };

  // 4. Spacing Mode
  const spacingMap: Record<DesignDNA["spacingMode"], string> = {
    compact: "py-12 md:py-16 gap-4",
    balanced: "py-20 md:py-28 gap-8",
    airy: "py-32 md:py-48 gap-12",
  };

  return {
    base: `${typographyMap[dna.typographyMood]} ${colorMap[dna.colorMode]}`,
    section: `${styles.section} ${spacingMap[dna.spacingMode]}`,
    card: `${styles.card} ${cardMap[dna.cardStyle]}`,
    heading: `${styles.heading} ${dna.typographyMood === 'premium-serif' ? 'text-4xl md:text-6xl' : 'text-3xl md:text-5xl'}`,
    dna,
  };
}
