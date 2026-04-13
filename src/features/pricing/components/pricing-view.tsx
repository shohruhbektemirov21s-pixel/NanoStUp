"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const MONTHS = [1, 3, 6, 9, 12] as const;

type TierId = "basic" | "pro" | "premium";

function discountFactor(months: number): number {
  if (months >= 12) return 0.78;
  if (months >= 9) return 0.82;
  if (months >= 6) return 0.88;
  if (months >= 3) return 0.93;
  return 1;
}

export function PricingView() {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const reduced = useReducedMotion();
  const [months, setMonths] = useState<number>(3);

  const factor = useMemo(() => discountFactor(months), [months]);

  const tiers: {
    id: TierId;
    baseUsd: number;
    highlight?: boolean;
  }[] = [
    { id: "basic", baseUsd: 9 },
    { id: "pro", baseUsd: 29, highlight: true },
    { id: "premium", baseUsd: 79 },
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTier, setModalTier] = useState<TierId | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const openPayModal = (tierId: TierId) => {
    setModalTier(tierId);
    setCheckoutError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (checkoutLoading) {
      return;
    }
    setModalOpen(false);
    setModalTier(null);
    setCheckoutError(null);
  };

  const startPaymeCheckout = async () => {
    if (!modalTier) {
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/payments/payme/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: modalTier,
          months,
          locale: locale === "ru" || locale === "en" || locale === "uz" ? locale : "uz",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        checkoutUrl?: string;
      };
      if (!res.ok || !data.ok || !data.checkoutUrl) {
        const code = data.error ?? "unknown";
        if (code === "builder_auth_required") {
          setCheckoutError(t("payErrorNeedLogin"));
        } else if (code === "payme_not_configured") {
          setCheckoutError(t("payErrorNotConfigured"));
        } else {
          setCheckoutError(t("payErrorGeneric"));
        }
        setCheckoutLoading(false);
        return;
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setCheckoutError(t("payErrorNetwork"));
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
      <motion.header
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.35rem]">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("subtitle")}</p>
      </motion.header>

      <div className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2 rounded-2xl border border-white/20 bg-white/40 p-2 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40">
        {MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              months === m
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-white/60 dark:hover:bg-slate-800/60",
            )}
          >
            {t("monthsShort", { n: m })}
          </button>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => {
          const price = Math.round(tier.baseUsd * months * factor);
          const rawFeatures = t.raw(`tiers.${tier.id}.features`);
          const featureList = Array.isArray(rawFeatures) ? (rawFeatures as string[]) : [];
          return (
            <motion.article
              key={tier.id}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative flex flex-col rounded-2xl border border-white/25 bg-white/55 p-6 shadow-xl shadow-slate-900/8 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45",
                tier.highlight && "ring-2 ring-primary/40 lg:scale-[1.02]",
              )}
            >
              {tier.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  {t("popular")}
                </span>
              ) : null}
              <h2 className="text-lg font-bold text-foreground">{t(`tiers.${tier.id}.name`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(`tiers.${tier.id}.tagline`)}</p>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
                ${price}
                <span className="text-base font-semibold text-muted-foreground"> / {t("perPeriod", { months: String(months) })}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-muted-foreground">
                {featureList.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openPayModal(tier.id)}
                className="mt-8 w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition hover:opacity-90"
              >
                {t("cta")}
              </button>
            </motion.article>
          );
        })}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">{t("legalNote")}</p>

      {modalOpen && modalTier ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payme-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-background p-6 shadow-2xl dark:border-white/10">
            <button
              type="button"
              onClick={closeModal}
              disabled={checkoutLoading}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
              aria-label={t("payModalCloseAria")}
            >
              <X className="size-5" />
            </button>
            <h2 id="payme-modal-title" className="pr-10 text-lg font-bold text-foreground">
              {t("payModalTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("payModalBody", { tier: t(`tiers.${modalTier}.name`), months })}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("payModalHint")}</p>
            {checkoutError ? <p className="mt-3 text-sm font-medium text-destructive">{checkoutError}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={checkoutLoading}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
              >
                {t("payModalCancel")}
              </button>
              <button
                type="button"
                onClick={() => void startPaymeCheckout()}
                disabled={checkoutLoading}
                className="inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-70"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("payModalLoading")}
                  </>
                ) : (
                  t("payModalConfirm")
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
