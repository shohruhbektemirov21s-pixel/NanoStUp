'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, { stiffness: 40, damping: 20 });
  const displayValue = useTransform(spring, (current) => 
    Math.floor(current).toLocaleString() + suffix
  );

  useEffect(() => {
    if (inView) spring.set(value);
  }, [inView, value, spring]);

  return <motion.span ref={ref}>{displayValue}</motion.span>;
}

export function PremiumStats() {
  const t = useTranslations('Stats');

  const stats = [
    { label: t('generatedSites'), value: 12500, suffix: '+' },
    { label: t('businessTypes'), value: 64, suffix: '+' },
    { label: t('countries'), value: 32, suffix: '+' },
    { label: t('uptime'), value: 99.9, suffix: '%' },
  ];

  return (
    <section className="py-24 border-y border-white/5 bg-zinc-950/50 backdrop-blur-sm relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center group"
          >
            <div className="text-5xl md:text-6xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 group-hover:to-white transition-all duration-500">
              <Counter value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] group-hover:text-purple-400 transition-colors">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
