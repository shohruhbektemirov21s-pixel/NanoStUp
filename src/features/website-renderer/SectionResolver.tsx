"use client";

import React from "react";
import { WebsiteSection } from "../../lib/schema/website";
import { DesignDNA } from "../../lib/schema/blueprint";
import { HeroRenderer } from "./sections/HeroRenderer";
import { NavbarRenderer } from "./sections/NavbarRenderer";
import { 
  ServicesRenderer, 
  PricingRenderer, 
  FAQRenderer, 
  GalleryRenderer 
} from "./sections/AdditionalRenderers";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Star } from "lucide-react";

const NavbarPlaceholder = ({ content }: any) => (
  <nav className="py-4 px-8 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
    <div className="font-bold text-xl">{content.logo || "Brand"}</div>
    <div className="flex gap-6">
      {content.links?.map((link: any, i: number) => (
        <a key={i} href={link.href} className="hover:text-primary transition-colors">{link.label}</a>
      ))}
    </div>
  </nav>
);

const FeaturesPlaceholder = ({ content, styles }: any) => (
  <section className="py-20 container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">{content.heading}</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {content.items?.map((item: any, i: number) => (
        <div key={i} className={styles.card + " p-8 h-full"}>
          <h3 className="text-xl font-bold mb-4">{item.title}</h3>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  </section>
);

const FooterPlaceholder = ({ content }: any) => (
  <footer className="py-12 border-t bg-slate-50">
    <div className="container mx-auto px-4 text-center text-muted-foreground">
      {content.text}
    </div>
  </footer>
);

const ContactPlaceholder = ({ content }: any) => (
  <section className="py-20 bg-slate-50">
    <div className="container mx-auto px-4 max-w-2xl text-center">
      <h2 className="text-3xl font-bold mb-8">{content.heading || "Contact Us"}</h2>
      <div className="grid gap-4">
        {content.email && <p>Email: {content.email}</p>}
        {content.phone && <p>Phone: {content.phone}</p>}
        {content.address && <p>Address: {content.address}</p>}
      </div>
    </div>
  </section>
);

export function SectionResolver({ section, dna, styles }: { section: WebsiteSection; dna: DesignDNA; styles: any }) {
  switch (section.type) {
    case "navbar":
      return <NavbarRenderer content={section.content} dna={dna} />;
    case "hero":
      return <HeroRenderer section={section} dna={dna} />;
    case "features":
      return <FeaturesRenderer section={section} styles={styles} />;
    case "services":
      return <ServicesRenderer section={section} styles={styles} />;
    case "pricing":
      return <PricingRenderer section={section} styles={styles} />;
    case "faq":
      return <FAQRenderer section={section} styles={styles} />;
    case "gallery":
      return <GalleryRenderer section={section} styles={styles} />;
    case "footer":
      return <FooterPlaceholder content={section.content} />;
    case "contact":
      return <ContactPlaceholder content={section.content} />;
    case "cta":
      return <CTARenderer section={section} styles={styles} />;
    case "testimonials":
      return <TestimonialsRenderer section={section} styles={styles} />;
    default:
      return (
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl mx-4 my-8">
          <p className="text-slate-400">Section type "{section.type}" variant "{section.variant}" not yet fully implemented</p>
        </div>
      );
  }
}

function FeaturesRenderer({ section, styles }: any) {
  const { heading, items } = section.content;
  return (
    <section className={styles.section}>
      <div className="container mx-auto px-6">
        <h2 className={`${styles.heading} text-center mb-16 max-w-2xl mx-auto`}>{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items?.map((item: any, i: number) => (
            <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className={`${styles.card} p-8 group`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTARenderer({ section, styles }: any) {
  const { title, description, button } = section.content;
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="bg-primary rounded-[2.5rem] p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black mb-6">{title}</h2>
            <p className="text-xl text-primary-foreground/80 mb-10">{description}</p>
            {button && (
              <a href={button.href} className="inline-flex items-center gap-2 px-10 py-4 bg-white text-primary rounded-full font-bold hover:scale-105 transition-all shadow-xl">
                {button.label}
                <ChevronRight size={20} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsRenderer({ section, styles }: any) {
  const { heading, items } = section.content;
  return (
    <section className={styles.section + " bg-slate-50/50"}>
      <div className="container mx-auto px-6">
        <h2 className={`${styles.heading} text-center mb-16`}>{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items?.map((item: any, i: number) => (
            <div key={i} className={`${styles.card} p-8 flex flex-col justify-between`}>
              <div>
                <div className="flex gap-1 text-orange-400 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-lg italic text-slate-700 mb-8 leading-relaxed">"{item.quote}"</p>
              </div>
              <div className="flex items-center gap-4 border-t pt-6 border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div>
                  <p className="font-bold text-slate-900">{item.author}</p>
                  <p className="text-xs text-slate-500">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
