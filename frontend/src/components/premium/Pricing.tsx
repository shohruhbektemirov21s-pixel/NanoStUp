'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PremiumPricing() {
  const t = useTranslations('Pricing');

  const plans = [
    {
      name: t('free'),
      price: "0",
      features: [
        `5 ${t('features.aiGen')}`,
        `1 ${t('features.projects')}`,
        t('features.export'),
      ],
      cta: t('choose'),
      popular: false
    },
    {
      name: t('basic'),
      price: "19",
      features: [
        `50 ${t('features.aiGen')}`,
        `10 ${t('features.projects')}`,
        t('features.export'),
        t('features.support')
      ],
      cta: t('choose'),
      popular: true
    },
    {
      name: t('premium'),
      price: "49",
      features: [
        `Unlimited ${t('features.aiGen')}`,
        `Unlimited ${t('features.projects')}`,
        t('features.export'),
        `Dedicated ${t('features.support')}`
      ],
      cta: t('choose'),
      popular: false
    }
  ];

  return (
    <section className="py-32 px-6 relative bg-zinc-950" id="pricing">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black mb-6"
          >
            {t('title')}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-xl font-medium"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "relative p-10 rounded-[2.5rem] border transition-all duration-500",
                plan.popular 
                  ? "bg-white text-black border-white shadow-2xl shadow-white/10 scale-105 z-10" 
                  : "bg-zinc-900/40 text-white border-white/5 hover:border-white/10"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  MOST POPULAR
                </div>
              )}

              <div className="mb-8">
                <h3 className={cn("text-xl font-bold mb-4", plan.popular ? "text-zinc-500" : "text-zinc-400")}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">${plan.price}</span>
                  <span className={cn("text-sm font-medium", plan.popular ? "text-zinc-500" : "text-zinc-500")}>/mo</span>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center",
                      plan.popular ? "bg-black/5 text-black" : "bg-white/5 text-white"
                    )}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className={cn("text-sm font-semibold", plan.popular ? "text-zinc-800" : "text-zinc-400")}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button className={cn(
                "w-full h-14 rounded-2xl text-lg font-bold transition-all active:scale-95",
                plan.popular 
                  ? "bg-black text-white hover:bg-zinc-900" 
                  : "bg-white text-black hover:bg-zinc-200"
              )}>
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
