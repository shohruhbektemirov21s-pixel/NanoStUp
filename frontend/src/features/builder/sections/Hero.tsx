import React from 'react';

export const Hero = ({ content }: { content: any }) => {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold text-zinc-900 leading-tight">
          {content.title || 'Welcome to our platform'}
        </h1>
        <p className="mt-6 text-xl text-zinc-600">
          {content.description || 'The best solution for your business needs.'}
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <button className="px-8 py-4 bg-zinc-900 text-white rounded-full font-semibold">
            {content.ctaText || 'Get Started'}
          </button>
        </div>
      </div>
    </section>
  );
};
