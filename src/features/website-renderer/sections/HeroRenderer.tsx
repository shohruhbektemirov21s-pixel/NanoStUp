"use client";

import React from "react";
import { motion } from "framer-motion";
import { WebsiteSection } from "../../../lib/schema/website";
import { getStyleConfig } from "../DesignSystem";

export function HeroRenderer({ section, dna }: { section: WebsiteSection; dna: any }) {
  const styles = getStyleConfig(dna);
  const { title, subtitle, primaryCta, secondaryCta, badge, image } = section.content;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, staggerChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const renderContent = () => (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="max-w-4xl mx-auto text-center"
    >
      {badge && (
        <motion.span 
          variants={itemVariants}
          className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider uppercase bg-primary/10 text-primary rounded-full"
        >
          {badge}
        </motion.span>
      )}
      <motion.h1 
        variants={itemVariants}
        className={`${styles.heading} mb-6 leading-[1.1]`}
      >
        {title}
      </motion.h1>
      <motion.p 
        variants={itemVariants}
        className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
      >
        {subtitle}
      </motion.p>
      <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
        {primaryCta && (
          <a 
            href={primaryCta.href}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            {primaryCta.label}
          </a>
        )}
        {secondaryCta && (
          <a 
            href={secondaryCta.href}
            className="px-8 py-4 bg-secondary text-secondary-foreground border border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-all"
          >
            {secondaryCta.label}
          </a>
        )}
      </motion.div>
    </motion.div>
  );

  const getVariantLayout = () => {
    switch (dna.heroVariant) {
      case "split-hero":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
               {/* Reusing logic but left-aligned for split */}
               <motion.div variants={containerVariants} initial="hidden" whileInView="visible">
                  {badge && <span className="inline-block px-3 py-1 mb-4 text-xs font-bold bg-primary/10 rounded">{badge}</span>}
                  <h1 className={`${styles.heading} mb-6`}>{title}</h1>
                  <p className="text-lg text-muted-foreground mb-8">{subtitle}</p>
                  <div className="flex gap-4">
                    {primaryCta && <a href={primaryCta.href} className="px-6 py-3 bg-primary text-white rounded">{primaryCta.label}</a>}
                  </div>
               </motion.div>
            </div>
            <div className="relative aspect-square lg:aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
              {image && <img src={image} alt="Hero" className="w-full h-full object-cover" />}
            </div>
          </div>
        );
      case "centered-hero":
      default:
        return renderContent();
    }
  };

  return (
    <section className={`${styles.section} bg-gradient-to-b from-transparent to-slate-50/50`}>
      <div className="container mx-auto px-4">
        {getVariantLayout()}
      </div>
    </section>
  );
}
