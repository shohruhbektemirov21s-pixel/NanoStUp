'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Layout, Zap, Globe, Shield, Cpu, Rocket } from 'lucide-react';

export function PremiumFeatures() {
  const t = useTranslations('Features');

  const features = [
    {
      icon: <Layout className="w-8 h-8" />,
      title: t('multiPage.title'),
      desc: t('multiPage.desc'),
      color: "from-purple-500 to-purple-700"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: t('instantPreview.title'),
      desc: t('instantPreview.desc'),
      color: "from-blue-500 to-blue-700"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: t('multiLanguage.title'),
      desc: t('multiLanguage.desc'),
      color: "from-emerald-500 to-emerald-700"
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: "AI Core Engine",
      desc: "Advanced AI with deep understanding of marketing intent and business needs.",
      color: "from-orange-500 to-orange-700"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Bank-level Security",
      desc: "Your data is encrypted and protected with state-of-the-art security protocols.",
      color: "from-blue-400 to-indigo-600"
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Optimized Speed",
      desc: "Lightweight code delivery ensures 100/100 Lighthouse performance scores.",
      color: "from-rose-500 to-rose-700"
    }
  ];

  return (
    <section className="py-32 px-6 relative bg-black" id="features">
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
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className="p-10 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 group relative overflow-hidden"
            >
              {/* Card Highlight */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-8 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                {feature.icon}
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-zinc-500 leading-relaxed font-medium group-hover:text-zinc-400 transition-colors">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
