"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { AnimatedSection } from "./animated-section";
import { cardSurface, focusRing, mutedText, sectionShell } from "./section-theme";
import type { PricingPlan, PricingSectionProps } from "../types/section.types";

export function PricingSection({
  id,
  className,
  theme,
  title,
  description,
  plans,
}: PricingSectionProps) {
  const reactId = useId().replace(/:/g, "");
  const sectionId = id ?? `pricing-${reactId}`;
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

        <ul
          className="mt-12 grid list-none gap-6 lg:grid-cols-3"
          aria-label="Tarif rejalar"
        >
          {plans.map((plan: PricingPlan, index: number) => {
            const planTitleId = `${sectionId}-plan-${plan.id}-title`;
            const planDescId = `${sectionId}-plan-${plan.id}-desc`;
            const priceId = `${sectionId}-plan-${plan.id}-price`;
            const listId = `${sectionId}-plan-${plan.id}-features`;

            return (
              <li key={plan.id}>
                <motion.article
                  className={cn(
                    cardSurface(theme),
                    "relative flex h-full flex-col p-6 sm:p-7",
                    plan.recommended &&
                      theme === "light" &&
                      "border-indigo-300/80 shadow-indigo-100 ring-2 ring-indigo-500/15",
                    plan.recommended &&
                      theme === "dark" &&
                      "border-indigo-400/40 shadow-indigo-950/40 ring-2 ring-indigo-400/25",
                  )}
                  initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: reduced ? 0 : 0.42,
                    delay: reduced ? 0 : index * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  aria-labelledby={planTitleId}
                  aria-describedby={`${planDescId} ${priceId}`}
                >
                  {plan.recommended ? (
                    <p
                      className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold",
                        theme === "light" && "bg-indigo-600 text-white",
                        theme === "dark" && "bg-indigo-400 text-slate-950",
                      )}
                      role="status"
                    >
                      Tavsiya etiladi
                    </p>
                  ) : null}

                  <h3 id={planTitleId} className="text-xl font-semibold tracking-tight">
                    {plan.name}
                  </h3>
                  <p id={planDescId} className={cn("mt-2 text-sm", mutedText(theme))}>
                    {plan.description}
                  </p>

                  <div id={priceId} className="mt-6">
                    <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{plan.priceLabel}</p>
                    {plan.billingNote ? (
                      <p className={cn("mt-1 text-sm", mutedText(theme))}>{plan.billingNote}</p>
                    ) : null}
                  </div>

                  <ul
                    id={listId}
                    className="mt-6 flex flex-1 flex-col gap-3 text-sm"
                    aria-label={`${plan.name} rejasi imkoniyatlari`}
                  >
                    {plan.features.map((feature: string, featureIndex: number) => (
                      <li key={`${plan.id}-f-${featureIndex}`} className="flex gap-2">
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            theme === "light" ? "text-emerald-600" : "text-emerald-400",
                          )}
                          aria-hidden
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={plan.cta.href}
                    className={cn(
                      "mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold",
                      plan.recommended
                        ? theme === "light"
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-indigo-400 text-slate-950 hover:bg-indigo-300"
                        : theme === "light"
                          ? "border border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                          : "border border-slate-700 bg-slate-950/40 text-slate-50 hover:border-slate-500",
                      focusRing(theme),
                    )}
                  >
                    {plan.cta.label}
                  </a>
                </motion.article>
              </li>
            );
          })}
        </ul>
      </div>
    </AnimatedSection>
  );
}
