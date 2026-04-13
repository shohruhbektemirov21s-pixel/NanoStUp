"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Mail, MapPin, Phone } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { AnimatedSection } from "./animated-section";
import { cardSurface, focusRing, mutedText, sectionShell } from "./section-theme";
import type { ContactsSectionProps } from "../types/section.types";

type ContactCardProps = {
  theme: ContactsSectionProps["theme"];
  href: string;
  label: string;
  value: string;
  icon: LucideIcon;
};

function ContactCard({ theme, href, label, value, icon: Icon }: ContactCardProps) {
  return (
    <a
      href={href}
      className={cn(
        cardSurface(theme),
        "flex items-start gap-4 p-5 sm:p-6",
        "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        focusRing(theme),
      )}
      aria-label={`${label}: ${value}`}
    >
      <span
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border",
          theme === "light" && "border-slate-200 bg-slate-50 text-slate-900",
          theme === "dark" && "border-slate-700 bg-slate-800/80 text-slate-50",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="mt-1 block break-words text-base font-semibold">{value}</span>
      </span>
    </a>
  );
}

export function ContactsSection({
  id,
  className,
  theme,
  title,
  description,
  email,
  phone,
  address,
}: ContactsSectionProps) {
  const reactId = useId().replace(/:/g, "");
  const sectionId = id ?? `contacts-${reactId}`;
  const titleId = `${sectionId}-title`;
  const descId = `${sectionId}-desc`;
  const reduced = useReducedMotion();

  const hasAnyChannel = Boolean(email ?? phone ?? address);

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

        {hasAnyChannel ? (
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {email ? (
              <motion.div
                initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.02 }}
              >
                <ContactCard
                  theme={theme}
                  href={`mailto:${email}`}
                  label="Email"
                  value={email}
                  icon={Mail}
                />
              </motion.div>
            ) : null}
            {phone ? (
              <motion.div
                initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.08 }}
              >
                <ContactCard
                  theme={theme}
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  label="Telefon"
                  value={phone}
                  icon={Phone}
                />
              </motion.div>
            ) : null}
            {address ? (
              <motion.div
                initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.14 }}
              >
                <address className={cn(cardSurface(theme), "not-italic")}>
                  <div className="flex items-start gap-4 p-5 sm:p-6">
                    <span
                      className={cn(
                        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border",
                        theme === "light" && "border-slate-200 bg-slate-50 text-slate-900",
                        theme === "dark" && "border-slate-700 bg-slate-800/80 text-slate-50",
                      )}
                    >
                      <MapPin className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Manzil
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-base font-semibold leading-relaxed",
                          theme === "light" && "text-slate-800",
                          theme === "dark" && "text-slate-100",
                        )}
                      >
                        {address}
                      </p>
                    </div>
                  </div>
                </address>
              </motion.div>
            ) : null}
          </div>
        ) : (
          <p className={cn("mt-10 text-center text-sm", mutedText(theme))} role="status">
            Aloqa kanallari hozircha ko‘rsatilmagan.
          </p>
        )}
      </div>
    </AnimatedSection>
  );
}
