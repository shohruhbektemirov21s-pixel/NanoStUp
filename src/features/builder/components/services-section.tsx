"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Layers, LineChart, ShieldCheck, Workflow } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { AnimatedSection } from "./animated-section";
import { cardSurface, focusRing, mutedText, sectionShell } from "./section-theme";
import type { ServiceItem, ServicesSectionProps } from "../types/section.types";

const ICONS = [Layers, Workflow, ShieldCheck, LineChart] as const;

function pickIcon(index: number) {
  return ICONS[index % ICONS.length];
}

export function ServicesSection({
  id,
  className,
  theme,
  title,
  description,
  items,
}: ServicesSectionProps) {
  const reactId = useId().replace(/:/g, "");
  const sectionId = id ?? `services-${reactId}`;
  const titleId = `${sectionId}-title`;
  const descId = `${sectionId}-desc`;
  const reduced = useReducedMotion();

  return (
    <AnimatedSection
      id={sectionId}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={cn(sectionShell(theme), className)}
    >
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id={titleId} className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p id={descId} className={cn("mt-4 text-pretty text-base sm:text-lg", mutedText(theme))}>
            {description}
          </p>
        </div>

        <ul className="mt-12 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Xizmatlar ro‘yxati">
          {items.map((item: ServiceItem, index: number) => {
            const Icon = pickIcon(index);
            const itemTitleId = `${sectionId}-item-${item.id}-title`;
            const itemDescId = `${sectionId}-item-${item.id}-desc`;
            return (
              <li key={item.id}>
                <motion.article
                  className={cn(cardSurface(theme), "h-full p-6 sm:p-7")}
                  initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    duration: reduced ? 0 : 0.4,
                    delay: reduced ? 0 : index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  aria-labelledby={itemTitleId}
                  aria-describedby={itemDescId}
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex size-11 items-center justify-center rounded-xl border",
                      theme === "light" && "border-slate-200 bg-slate-50 text-slate-900",
                      theme === "dark" && "border-slate-700 bg-slate-800/80 text-slate-50",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 id={itemTitleId} className="text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p id={itemDescId} className={cn("mt-2 text-sm leading-relaxed sm:text-[15px]", mutedText(theme))}>
                    {item.description}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className={cn(
                        "mt-5 inline-flex text-sm font-semibold underline-offset-4 hover:underline",
                        theme === "light" && "text-indigo-700",
                        theme === "dark" && "text-indigo-300",
                        focusRing(theme),
                        "rounded-sm",
                      )}
                    >
                      {item.ctaLabel ?? "Batafsil"}
                    </a>
                  ) : null}
                </motion.article>
              </li>
            );
          })}
        </ul>
      </div>
    </AnimatedSection>
  );
}
