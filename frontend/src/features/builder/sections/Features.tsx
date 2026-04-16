import React from 'react';

export const Features = ({ content }: { content: any }) => {
  const items = content.items || [
    { title: 'Feature 1', desc: 'Description' },
    { title: 'Feature 2', desc: 'Description' },
    { title: 'Feature 3', desc: 'Description' },
  ];

  return (
    <section className="bg-zinc-50 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">{content.title || 'Our Features'}</h2>
        <div className="grid md:grid-cols-3 gap-12">
          {items.map((item: any, i: number) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-zinc-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
