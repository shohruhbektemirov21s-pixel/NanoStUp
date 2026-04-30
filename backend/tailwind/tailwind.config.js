/** @type {import('tailwindcss').Config} */
module.exports = {
  // Backend HTML template'larni skanerlaymiz — faqat ishlatilgan classlar
  // generatsiya qilinadi. Boshqa Django template'lar (admin, auth) e'tibor
  // bermaymiz.
  content: [
    "../apps/site_renderer/templates/**/*.html",
    "../apps/site_renderer/templates/sites/**/*.html",
  ],
  // CSS variables COLOR_PALETTES dan keladi — Tailwind classlari
  // ularni `var(--color-primary)` orqali ishlatadi.
  theme: {
    extend: {
      colors: {
        // Site-level CSS variables (views.py'dagi colors dict bilan sinxron)
        primary: "var(--color-primary)",
        accent:  "var(--color-accent)",
        surface: "var(--color-surface)",
        muted:   "var(--color-muted)",
        // bg, text, border — Tailwind'dagi default class nomlari bilan
        // to'qnashadi, shu sababli faqat custom utility classlardan foydalanamiz
        // (input.css ichida).
      },
      fontFamily: {
        // CSS variable orqali keladi (typography_variant'ga qarab)
        heading: "var(--font-heading)",
        body:    "var(--font-body)",
      },
      maxWidth: {
        "container": "1200px",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" },
                   "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
