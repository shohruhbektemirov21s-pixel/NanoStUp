"use client";

import React from "react";
import { WebsiteSchema } from "../../lib/schema/website";
import { SectionResolver } from "./SectionResolver";
import { getStyleConfig } from "./DesignSystem";

interface WebsiteRendererProps {
  schema: WebsiteSchema;
  activePageSlug?: string;
}

export function WebsiteRenderer({ schema, activePageSlug = "" }: WebsiteRendererProps) {
  const activePage = schema.pages.find(p => p.slug === activePageSlug) || schema.pages[0];
  const styles = getStyleConfig(schema.designDNA);

  if (!activePage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${styles.base}`}>
      {/* 
        We separate navbar and footer if they are defined at the page level 
        or site level. In our schema, they are sections within pages for simplicity.
      */}
      {activePage.sections.map((section) => (
        <SectionResolver 
          key={section.id} 
          section={section} 
          dna={schema.designDNA} 
          styles={styles}
        />
      ))}
    </div>
  );
}
