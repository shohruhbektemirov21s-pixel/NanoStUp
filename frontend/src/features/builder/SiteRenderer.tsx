'use client';

import React, { useState } from 'react';

interface SectionContent {
  [key: string]: unknown;
}

interface Section {
  id?: string;
  type: string;
  content?: SectionContent;
  settings?: Record<string, unknown>;
}

interface Page {
  slug?: string;
  title?: string;
  sections?: Section[];
}

interface SiteSchema {
  siteName?: string;
  pages?: Page[];
  [key: string]: unknown;
}

// ── Section renderers ──────────────────────────────────────────

function Hero({ content }: { content: SectionContent }) {
  const title = String(content.title ?? content.heading ?? 'Xush kelibsiz');
  const desc = String(content.description ?? content.subtitle ?? '');
  const cta = String(content.ctaText ?? content.cta ?? content.button ?? '');
  return (
    <section className="py-16 md:py-24 px-4 md:px-6 text-center bg-gradient-to-b from-zinc-50 to-white">
      <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-zinc-900 max-w-4xl mx-auto leading-tight break-words">
        {title}
      </h1>
      {desc && (
        <p className="mt-5 md:mt-6 text-base sm:text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          {desc}
        </p>
      )}
      {cta && (
        <a
          href="#"
          className="inline-block mt-7 md:mt-10 px-6 md:px-8 py-3 md:py-4 bg-zinc-900 text-white font-bold rounded-2xl shadow-lg hover:bg-zinc-800 transition-colors text-sm md:text-base"
        >
          {cta}
        </a>
      )}
    </section>
  );
}

interface ListItem {
  title?: string;
  name?: string;
  desc?: string;
  description?: string;
  text?: string;
}

function Features({ content }: { content: SectionContent }) {
  const title = String(content.title ?? 'Xizmatlarimiz');
  const items: ListItem[] = (content.items as ListItem[]) ?? (content.features as ListItem[]) ?? [];
  return (
    <section className="py-14 md:py-20 px-4 md:px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center text-zinc-900 mb-8 md:mb-12">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-5 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-zinc-100 shadow-sm">
              <h3 className="text-lg md:text-xl font-bold text-zinc-900">{item.title ?? item.name ?? ''}</h3>
              <p className="mt-2 md:mt-3 text-sm md:text-base text-zinc-600">{item.desc ?? item.description ?? item.text ?? ''}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface StatItem {
  value?: string | number;
  number?: string | number;
  label?: string;
  title?: string;
}

function Stats({ content }: { content: SectionContent }) {
  const items: StatItem[] = (content.items as StatItem[]) ?? (content.stats as StatItem[]) ?? [];
  return (
    <section className="py-14 md:py-20 px-4 md:px-6 bg-white">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl md:text-5xl font-black text-zinc-900">{item.value ?? item.number ?? ''}</div>
            <div className="mt-1.5 md:mt-2 text-xs md:text-sm font-semibold text-zinc-500 uppercase tracking-wider md:tracking-widest">
              {item.label ?? item.title ?? ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface PricingItem {
  name?: string;
  title?: string;
  price?: string | number;
  description?: string;
  cta?: string;
}

function Pricing({ content }: { content: SectionContent }) {
  const title = String(content.title ?? 'Tariflar');
  const items: PricingItem[] = (content.items as PricingItem[]) ?? (content.plans as PricingItem[]) ?? [];
  return (
    <section className="py-14 md:py-20 px-4 md:px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center text-zinc-900 mb-8 md:mb-12">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-5 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-zinc-200 flex flex-col">
              <h3 className="text-lg md:text-xl font-bold text-zinc-900">{item.name ?? item.title ?? ''}</h3>
              <div className="mt-3 md:mt-4 text-3xl md:text-4xl font-black">{item.price ?? ''}</div>
              <p className="mt-2 md:mt-3 text-sm md:text-base text-zinc-600 flex-1">{item.description ?? ''}</p>
              <a href="#" className="mt-5 md:mt-6 text-center px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm md:text-base">
                {item.cta ?? 'Tanlash'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ content }: { content: SectionContent }) {
  const title = String(content.title ?? 'Bog\'lanish');
  const email = content.email ? String(content.email) : '';
  const phone = content.phone ? String(content.phone) : '';
  const address = content.address ? String(content.address) : '';
  return (
    <section className="py-14 md:py-20 px-4 md:px-6 bg-white text-center">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900">{title}</h2>
      <div className="mt-5 md:mt-6 space-y-2 text-sm md:text-base text-zinc-600 break-words">
        {email && (
          <div>
            Email:{' '}
            <a className="underline" href={`mailto:${email}`}>
              {email}
            </a>
          </div>
        )}
        {phone && <div>Telefon: {phone}</div>}
        {address && <div>Manzil: {address}</div>}
      </div>
    </section>
  );
}

function About({ content }: { content: SectionContent }) {
  return <Hero content={content} />;
}

function Services({ content }: { content: SectionContent }) {
  return <Features content={content} />;
}

// ── Section map ────────────────────────────────────────────────

const SECTION_MAP: Record<string, React.FC<{ content: SectionContent }>> = {
  hero: Hero,
  features: Features,
  stats: Stats,
  pricing: Pricing,
  contact: Contact,
  about: About,
  services: Services,
};

// ── Schema normalizer — istalgan formatni {pages: Page[]} ga keltiradi ──

function normalizePages(schema: SiteSchema): Page[] {
  // Format 1: to'liq pages array (backend'ning standart formati)
  if (Array.isArray(schema.pages) && schema.pages.length > 0) {
    const valid = schema.pages.filter(
      (p) => Array.isArray(p?.sections) && p.sections.length > 0,
    );
    if (valid.length > 0) return valid;
  }

  // Format 2: {sections: [...]} — to'g'ridan-to'g'ri, bitta "home"
  const directSections = (schema as Record<string, unknown>).sections;
  if (Array.isArray(directSections) && directSections.length > 0) {
    return [{ slug: 'home', title: 'Home', sections: directSections as Section[] }];
  }

  // Format 3: sxemaning o'zi section-like kalitlarga ega
  const knownKeys = ['hero', 'features', 'services', 'about', 'stats', 'pricing', 'contact'];
  const inlineSections: Section[] = [];
  for (const key of knownKeys) {
    const val = (schema as Record<string, unknown>)[key];
    if (val && typeof val === 'object') {
      inlineSections.push({ id: key, type: key, content: val as SectionContent });
    }
  }
  if (inlineSections.length > 0) {
    return [{ slug: 'home', title: 'Home', sections: inlineSections }];
  }

  return [];
}

function renderSection(section: Section, i: number) {
  const Component = SECTION_MAP[section.type?.toLowerCase() ?? ''];
  const content: SectionContent = (section.content as SectionContent) ?? {};
  const key = section.id ?? `${section.type}-${i}`;
  if (!Component) {
    return (
      <div
        key={key}
        className="py-10 px-6 border border-dashed border-zinc-300 text-center text-zinc-400 m-6 rounded-3xl"
      >
        Bo&apos;lim: {section.type}
      </div>
    );
  }
  return (
    <div key={key} id={section.id}>
      <Component content={content} />
    </div>
  );
}

// ── Main renderer ──────────────────────────────────────────────

export const SiteRenderer = React.memo(function SiteRenderer({
  schema,
  initialPageSlug,
}: {
  schema: SiteSchema | null | undefined;
  initialPageSlug?: string;
}) {
  const pages = schema ? normalizePages(schema) : [];
  const firstSlug = pages[0]?.slug ?? 'home';
  const [activeSlug, setActiveSlug] = useState<string>(initialPageSlug ?? firstSlug);

  if (!schema) return null;

  if (pages.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-16 text-center">
        <div className="text-5xl mb-4">🏗️</div>
        <p className="font-bold text-zinc-500 mb-2">Sayt bo&apos;limlari topilmadi</p>
        <p className="text-zinc-400 text-sm">Chatda &quot;qaytadan yaratib ber&quot; deb yozing</p>
      </div>
    );
  }

  const activePage =
    pages.find((p) => p.slug === activeSlug) ?? pages[0];
  const sections = activePage.sections ?? [];
  const siteName = String(schema.siteName ?? schema.name ?? '');
  const isMultiPage = pages.length > 1;

  const pageLabel = (p: Page, idx: number) =>
    p.title || (p.slug ? p.slug.replace(/-/g, ' ') : `Sahifa ${idx + 1}`);

  return (
    <div className="w-full">
      {/* Navbar — sayt nomi + sahifalar yoki bo'limlar */}
      {(siteName || isMultiPage) && (
        <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-zinc-100 px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-2 md:gap-3">
          {siteName && (
            <span className="font-black text-base md:text-lg text-zinc-900">{siteName}</span>
          )}
          {isMultiPage ? (
            <div className="flex gap-1 text-xs md:text-sm overflow-x-auto max-w-full">
              {pages.map((p, idx) => {
                const isActive = p.slug === activePage.slug;
                return (
                  <button
                    key={p.slug ?? idx}
                    type="button"
                    onClick={() => setActiveSlug(p.slug ?? `page-${idx}`)}
                    className={
                      'px-2.5 md:px-3 py-1.5 rounded-lg font-semibold transition-colors capitalize whitespace-nowrap ' +
                      (isActive
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100')
                    }
                  >
                    {pageLabel(p, idx)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-3 md:gap-4 text-xs md:text-sm text-zinc-500 overflow-x-auto max-w-full">
              {sections.map((s, idx) => (
                <a
                  key={s.id ?? idx}
                  href={`#${s.id}`}
                  className="hover:text-zinc-900 transition-colors capitalize whitespace-nowrap"
                >
                  {s.type}
                </a>
              ))}
            </div>
          )}
        </nav>
      )}

      {sections.map(renderSection)}
    </div>
  );
});
