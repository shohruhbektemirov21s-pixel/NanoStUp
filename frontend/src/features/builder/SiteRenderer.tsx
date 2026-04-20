import React from 'react';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { Stats } from './sections/Stats';
import { Pricing } from './sections/Pricing';
import { Contact } from './sections/Contact';

const sectionMap: Record<string, React.FC<any>> = {
  hero: Hero,
  features: Features,
  stats: Stats,
  pricing: Pricing,
  contact: Contact,
  services: Features, // Fallback to features for now
  about: Hero, // Fallback to hero variant for now
};

export const SiteRenderer = React.memo(({ schema }: { schema: any }) => {
  if (!schema || !schema.pages) return null;

  const currentPage = (schema.pages || []).find((p: any) => p.slug === 'home') || schema.pages[0];

  if (!currentPage) return <div className="p-20 text-center font-bold">No pages found in schema.</div>;

  return (
    <div className="w-full">
      {(currentPage.sections || []).map((section: any, i: number) => {
        const type = String(section.type).toLowerCase();
        const Component = sectionMap[type];
        if (!Component) return <div key={i} className="p-10 border border-dashed border-zinc-200 text-zinc-400 text-center rounded-3xl m-6">Undefined section: {type}</div>;
        return <Component key={section.id || i} content={section.content} settings={section.settings} />;
      })}
    </div>
  );
});

SiteRenderer.displayName = 'SiteRenderer';
