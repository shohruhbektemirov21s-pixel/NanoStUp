'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Plus, Minus } from 'lucide-react';

export function PremiumFAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const faqs = [
    {
      q: "O'zbekistonda qanday qilib sayt yaratish mumkin?",
      a: "NanoStUp AI yordamida o'zbek tilida sayt yaratish juda oson. Shunchaki o'z biznesingiz haqida ma'lumot bering va AI sizga bir necha soniya ichida tayyor sayt yaratib beradi."
    },
    {
      q: "Sayt yaratish narxi qancha?",
      a: "Bizda bepul va premium tariflar mavjud. Oddiy sayt yaratish mutlaqo bepul, professional funksiyalar uchun esa hamyonbop obunalar taklif etamiz."
    },
    {
      q: "Sayt yaratish uchun qancha vaqt ketadi?",
      a: "Sun'iy intellektimiz 1 daqiqadan kam vaqt ichida to'liq veb-sayt generatori vazifasini bajaradi. Sizga matnlar, rasmlar va dizayn tayyor holda taqdim etiladi."
    },
    {
      q: "Yaratilgan saytni tahrirlash mumkinmi?",
      a: "Ha, siz chat orqali AIga ko'rsatmalar berib, saytning istalgan qismini tahrirlashingiz, ranglarini o'zgartirishingiz yoki yangi bo'limlar qo'shishingiz mumkin."
    }
  ];

  return (
    <section className="py-32 px-6 bg-black relative overflow-hidden" id="faq">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black mb-6"
          >
            Ko'p so'raladigan savollar
          </motion.h2>
          <p className="text-zinc-500 text-xl">
            Sayt yaratish xizmati haqida barcha javoblar
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-white/5 rounded-[2rem] bg-zinc-900/40 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-8 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-xl font-bold">{faq.q}</span>
                {openIndex === i ? <Minus className="w-6 h-6 text-purple-500" /> : <Plus className="w-6 h-6 text-zinc-500" />}
              </button>
              {openIndex === i && (
                <div className="px-8 pb-8 text-zinc-400 text-lg leading-relaxed">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
