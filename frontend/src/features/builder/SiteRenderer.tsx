import React from 'react';

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
    <section className="py-24 px-6 text-center bg-gradient-to-b from-zinc-50 to-white">
      <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 max-w-4xl mx-auto leading-tight">
        {title}
      </h1>
      {desc && (
        <p className="mt-6 text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          {desc}
        </p>
      )}
      {cta && (
        <a
          href="#"
          className="inline-block mt-10 px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl shadow-lg hover:bg-zinc-800 transition-colors"
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
    <section className="py-20 px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-center text-zinc-900 mb-12">{title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-8 bg-white rounded-3xl border border-zinc-100 shadow-sm">
              <h3 className="text-xl font-bold text-zinc-900">{item.title ?? item.name ?? ''}</h3>
              <p className="mt-3 text-zinc-600">{item.desc ?? item.description ?? item.text ?? ''}</p>
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
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-5xl font-black text-zinc-900">{item.value ?? item.number ?? ''}</div>
            <div className="mt-2 text-sm font-semibold text-zinc-500 uppercase tracking-widest">
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
    <section className="py-20 px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-center text-zinc-900 mb-12">{title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-8 bg-white rounded-3xl border border-zinc-200 flex flex-col">
              <h3 className="text-xl font-bold text-zinc-900">{item.name ?? item.title ?? ''}</h3>
              <div className="mt-4 text-4xl font-black">{item.price ?? ''}</div>
              <p className="mt-3 text-zinc-600 flex-1">{item.description ?? ''}</p>
              <a href="#" className="mt-6 text-center px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl">
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
    <section className="py-20 px-6 bg-white text-center">
      <h2 className="text-4xl font-black text-zinc-900">{title}</h2>
      <div className="mt-6 space-y-2 text-zinc-600">
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

// ── Main renderer ──────────────────────────────────────────────

export const SiteRenderer = React.memo(function SiteRenderer({
  schema,
}: {
  schema: SiteSchema | null | undefined;
}) {
  if (!schema) return null;

  const pages = schema.pages ?? [];
  if (pages.length === 0) {
    return <div className="p-20 text-center font-bold text-zinc-500">Schema pages bo&#39;sh.</div>;
  }

  const page = pages.find((p) => p.slug === 'home') ?? pages[0];
  const sections = page.sections ?? [];

  return (
    <div className="w-full">
      {sections.map((section, i) => {
        const Component = SECTION_MAP[section.type?.toLowerCase() ?? ''];
        const content: SectionContent = (section.content as SectionContent) ?? {};
        if (!Component) {
          return (
            <div
              key={section.id ?? i}
              className="py-10 px-6 border border-dashed border-zinc-300 text-center text-zinc-400 m-6 rounded-3xl"
            >
              Noma&apos;lum section: {section.type}
            </div>
          );
        }
        return <Component key={section.id ?? i} content={content} />;
      })}
    </div>
  );
});
