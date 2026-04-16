"use client";

import React from "react";
import { motion } from "framer-motion";
import { getStyleConfig } from "../DesignSystem";

export function NavbarRenderer({ content, dna }: { content: any; dna: any }) {
  const styles = getStyleConfig(dna);
  const { logo, links } = content;

  const getNavbarStyles = () => {
    switch (dna.navbarVariant) {
      case "floating":
        return "mt-6 mx-4 rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-lg fixed top-0 left-0 right-0 z-50 transition-all";
      case "classic":
      default:
        return "bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50";
    }
  };

  return (
    <nav className={getNavbarStyles()}>
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-black tracking-tighter text-primary flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
             <div className="w-4 h-4 bg-primary rounded-sm rotate-45" />
          </div>
          {logo || "SiteBuilder"}
        </motion.div>

        <div className="hidden md:flex items-center gap-8">
          {links?.map((link: any, i: number) => (
            <motion.a 
              key={i} 
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors hover:scale-105 active:scale-95"
            >
              {link.label}
            </motion.a>
          ))}
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-all"
          >
            Get Started
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
