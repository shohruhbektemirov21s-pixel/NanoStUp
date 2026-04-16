"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, HelpCircle } from "lucide-react";

export function ServicesRenderer({ section, styles }: any) {
  const { heading, items } = section.content;
  return (
    <section className={styles.section}>
      <div className="container mx-auto px-6">
        <h2 className={`${styles.heading} mb-16`}>{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {items?.map((item: any, i: number) => (
            <div key={i} className="flex gap-6 group">
              <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
                {i + 1}
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                {item.price && <p className="mt-4 font-bold text-primary">{item.price}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingRenderer({ section, styles }: any) {
  const { heading, tiers } = section.content;
  return (
    <section className={styles.section + " bg-slate-50"}>
      <div className="container mx-auto px-6">
        <h2 className={`${styles.heading} text-center mb-16`}>{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers?.map((tier: any, i: number) => (
            <div key={i} className={`${styles.card} p-8 flex flex-col ${tier.popular ? 'border-2 border-primary ring-4 ring-primary/5 relative' : ''}`}>
              {tier.popular && <span className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">POPULAR</span>}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{tier.price}</span>
                  <span className="text-slate-400 text-sm">/oy</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {tier.features?.map((f: string, fi: number) => (
                  <li key={fi} className="flex items-center gap-3 text-sm text-slate-600">
                    <Check size={16} className="text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-4 rounded-xl font-bold transition-all ${tier.popular ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>
                Sotib olish
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQRenderer({ section, styles }: any) {
  const { heading, items } = section.content;
  return (
    <section className={styles.section}>
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className={`${styles.heading} mb-16 flex items-center gap-4`}>
          <HelpCircle className="text-primary" />
          {heading}
        </h2>
        <div className="space-y-6">
          {items?.map((item: any, i: number) => (
            <div key={i} className="border-b border-slate-100 pb-6 group">
              <h3 className="text-xl font-bold mb-3 flex items-center justify-between cursor-pointer group-hover:text-primary transition-colors">
                {item.question}
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GalleryRenderer({ section, styles }: any) {
  const { heading, items } = section.content;
  return (
    <section className={styles.section}>
      <div className="container mx-auto px-6">
        <h2 className={`${styles.heading} mb-16 text-center`}>{heading}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items?.map((item: any, i: number) => (
            <div key={i} className="aspect-square relative group overflow-hidden rounded-2xl bg-slate-100">
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center justify-center p-6 text-center">
                 <h4 className="text-white font-bold mb-2">{item.title}</h4>
                 <p className="text-white/70 text-xs">{item.description}</p>
              </div>
              <img src={`https://source.unsplash.com/random/800x800?${item.title}`} alt={item.imageAlt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
