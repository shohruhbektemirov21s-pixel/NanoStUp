import React from 'react';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';

const sectionMap: Record<string, React.FC<any>> = {
  hero: Hero,
  features: Features,
  // Add more sections here...
};

export const SiteRenderer = ({ schema }: { schema: any }) => {
  if (!schema || !schema.pages) return null;

  // For simplicity, we render the first page in the list (or 'home')
  const currentPage = schema.pages.find((p: any) => p.slug === 'home') || schema.pages[0];

  return (
    <div className="w-full">
      {currentPage.sections.map((section: any, i: number) => {
        const Component = sectionMap[section.type];
        if (!Component) return <div key={i}>Unknown section: {section.type}</div>;
        return <Component key={i} content={section.content} settings={section.settings} />;
      })}
    </div>
  );
};
