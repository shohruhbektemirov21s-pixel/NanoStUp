import React from 'react';
import { motion } from 'framer-motion';

export const Stats = ({ content }: { content: any }) => {
  return (
    <section className="py-20 bg-zinc-50 border-y border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
        {(content.items || []).map((item: any, i: number) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="text-4xl font-black text-zinc-900 mb-2">{item.value}</div>
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{item.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
