import React from 'react';
import { motion } from 'framer-motion';

export const Pricing = ({ content }: { content: any }) => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 text-center mb-16">
        <h2 className="text-4xl font-black text-zinc-900 mb-4">{content.title}</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto">{content.subtitle}</p>
      </div>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
        {(content.plans || []).map((plan: any, i: number) => (
          <div key={i} className="p-10 rounded-3xl border border-zinc-100 hover:border-purple-200 transition-all">
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="text-4xl font-black mb-6">{plan.price}</div>
            <ul className="space-y-4 mb-10">
              {plan.features.map((f: string, fi: number) => (
                <li key={fi} className="text-sm text-zinc-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-black transition-all">
              {content.buttonText || 'Choose Plan'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
