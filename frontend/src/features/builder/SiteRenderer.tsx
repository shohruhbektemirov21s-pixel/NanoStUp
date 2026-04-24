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

interface SiteSettings {
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  font?: string;
}

interface SiteSchema {
  siteName?: string;
  settings?: SiteSettings;
  pages?: Page[];
  [key: string]: unknown;
}

// ── Predefined palettes ─────────────────────────────────────────
const PALETTES = [
  { keys: ['restoran','cafe','kafe','food','taom','oshxona','pizza','burger','sushi'], primary:'#e85d04', accent:'#f48c06', bg:'#fff8f0', text:'#1a0a00', font:'Poppins' },
  { keys: ['salon','spa','beauty','go\'zallik','gozallik','kosmetik','nail','barber','soch'], primary:'#c9184a', accent:'#ff4d6d', bg:'#fff0f3', text:'#1a0005', font:'Playfair Display' },
  { keys: ['gym','fitness','sport','trener','bodybuilding','crossfit','yoga'], primary:'#e63946', accent:'#f4a261', bg:'#0d0d0d', text:'#ffffff', font:'Montserrat' },
  { keys: ['klinika','clinic','tibbiy','doktor','shifokor','hospital','health'], primary:'#0077b6', accent:'#00b4d8', bg:'#f0f8ff', text:'#023e8a', font:'Inter' },
  { keys: ['tech','saas','startup','software','it','dastur','ilovа','app','digital'], primary:'#6366f1', accent:'#8b5cf6', bg:'#0f0f1a', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['real','estate','uy','kvartira','property','ko\'chmas'], primary:'#1d4e89', accent:'#f4a261', bg:'#f8f9fa', text:'#1a1a2e', font:'Raleway' },
  { keys: ['ta\'lim','talim','kurs','maktab','akademiya','school','academy','edu'], primary:'#2d6a4f', accent:'#52b788', bg:'#f0fff4', text:'#081c15', font:'Poppins' },
  { keys: ['agentlik','agency','kreativ','creative','dizayn','design','studio'], primary:'#7209b7', accent:'#f72585', bg:'#10002b', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['shop','do\'kon','dokon','market','mahsulot','store','ecommerce'], primary:'#e63946', accent:'#457b9d', bg:'#ffffff', text:'#1d3557', font:'Inter' },
  { keys: ['hotel','mehmonxona','turizm','travel','tourism','resort'], primary:'#b5838d', accent:'#e5989b', bg:'#fff4e6', text:'#2d1b1e', font:'Playfair Display' },
  { keys: ['avto','auto','mashina','car','transport','taxi'], primary:'#212529', accent:'#ffd60a', bg:'#0a0a0a', text:'#ffffff', font:'Montserrat' },
  { keys: ['portfolio','freelancer','portfolio','shaxsiy','personal'], primary:'#4361ee', accent:'#4cc9f0', bg:'#0d1b2a', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['qurilish','construction','arxitektura','architect','building'], primary:'#3a405a', accent:'#f4a261', bg:'#f5f5f0', text:'#1a1a2a', font:'Raleway' },
  { keys: ['yuridik','lawyer','advokat','legal','huquq'], primary:'#1b2a4a', accent:'#c9a84c', bg:'#f5f0e8', text:'#1b2a4a', font:'Playfair Display' },
];

function smartPalette(siteName: string, sections: string[]) {
  const hay = (siteName + ' ' + sections.join(' ')).toLowerCase();
  for (const p of PALETTES) {
    if (p.keys.some(k => hay.includes(k))) return p;
  }
  return { primary:'#2563eb', accent:'#7c3aed', bg:'#ffffff', text:'#111827', font:'Inter' };
}

function isPlain(color?: string) {
  if (!color) return true;
  const c = color.toLowerCase().replace('#','');
  return ['000000','111111','0d0d0d','1a1a1a','ffffff','fefefe','f8f8f8','f5f5f5','eeeeee','e5e5e5'].includes(c);
}

// ── Design token helper ─────────────────────────────────────────
function useColors(settings?: SiteSettings, siteName?: string, sectionTypes?: string[]) {
  const palette = (isPlain(settings?.primaryColor) || !settings?.primaryColor)
    ? smartPalette(siteName ?? '', sectionTypes ?? [])
    : null;

  const primary = (!isPlain(settings?.primaryColor) && settings?.primaryColor) ? settings.primaryColor : palette!.primary;
  const accent  = (!isPlain(settings?.accentColor)  && settings?.accentColor)  ? settings.accentColor  : (palette?.accent  ?? '#6366f1');
  const bg      = settings?.bgColor   ?? palette?.bg   ?? '#ffffff';
  const text    = settings?.textColor ?? palette?.text  ?? '#111827';
  const font    = settings?.font      ?? palette?.font  ?? 'Inter';
  // Light/dark detection for contrasting text on primary bg
  const isDarkPrimary = (() => {
    const hex = primary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();
  const onPrimary = isDarkPrimary ? '#ffffff' : '#18181b';
  const isDarkBg = (() => {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();
  const mutedText = isDarkBg ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const cardBg    = isDarkBg ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.03)';
  const cardBorder= isDarkBg ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.08)';
  const sectionAlt= isDarkBg ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  return { primary, accent, bg, text, font, onPrimary, mutedText, cardBg, cardBorder, sectionAlt, isDarkBg };
}

// ── Shared props type ───────────────────────────────────────────
type Colors = ReturnType<typeof useColors>;
type SectionProps = { content: SectionContent; colors: Colors };

// ── Section: Hero ───────────────────────────────────────────────
function Hero({ content, colors }: SectionProps) {
  const title    = String(content.title    ?? content.heading  ?? 'Xush kelibsiz');
  const subtitle = String(content.subtitle ?? '');
  const desc     = String(content.description ?? '');
  const cta      = String(content.ctaText  ?? content.cta ?? content.button ?? '');
  const cta2     = String(content.cta2Text ?? content.secondaryCta ?? '');
  const badge    = content.badge ? String(content.badge) : '';
  return (
    <section style={{ background: colors.bg, color: colors.text, fontFamily: colors.font }}
      className="py-20 md:py-32 px-4 md:px-8 text-center">
      {badge && (
        <span style={{ background: colors.primary + '18', color: colors.primary, border: `1px solid ${colors.primary}33` }}
          className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
          {badge}
        </span>
      )}
      <h1 style={{ color: colors.text }}
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-tight">
        {title}
      </h1>
      {subtitle && <p style={{ color: colors.primary }} className="mt-3 text-base sm:text-lg font-semibold max-w-xl mx-auto">{subtitle}</p>}
      {desc && <p style={{ color: colors.mutedText }} className="mt-4 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">{desc}</p>}
      {(cta || cta2) && (
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
          {cta && (
            <a href={String(content.ctaLink ?? '#contact')}
              style={{ background: colors.primary, color: colors.onPrimary }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity text-center">
              {cta}
            </a>
          )}
          {cta2 && (
            <a href="#"
              style={{ border: `2px solid ${colors.primary}`, color: colors.primary }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-bold text-sm hover:opacity-80 transition-opacity text-center bg-transparent">
              {cta2}
            </a>
          )}
        </div>
      )}
    </section>
  );
}

// ── Section: Features / Services ───────────────────────────────
interface ListItem { title?: string; name?: string; desc?: string; description?: string; text?: string; icon?: string; price?: string | number; }

function Features({ content, colors }: SectionProps) {
  const title    = String(content.title ?? 'Xizmatlarimiz');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: ListItem[] = (content.items as ListItem[]) ?? (content.features as ListItem[]) ?? [];
  const count = items.length;
  const cols = count <= 2 ? 'grid-cols-1 sm:grid-cols-2' : count === 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base max-w-xl mx-auto">{subtitle}</p>}
        </div>
        <div className={`grid ${cols} gap-4 md:gap-6`}>
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
              className="p-5 md:p-7 rounded-2xl">
              {item.icon && <div className="text-2xl mb-3">{item.icon}</div>}
              <h3 style={{ color: colors.text }} className="text-base md:text-lg font-bold">{item.title ?? item.name ?? ''}</h3>
              <p style={{ color: colors.mutedText }} className="mt-2 text-sm leading-relaxed">{item.desc ?? item.description ?? item.text ?? ''}</p>
              {item.price && <div style={{ color: colors.primary }} className="mt-3 font-black text-lg">{item.price}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Stats ──────────────────────────────────────────────
interface StatItem { value?: string | number; number?: string | number; label?: string; title?: string; icon?: string; }

function Stats({ content, colors }: SectionProps) {
  const items: StatItem[] = (content.items as StatItem[]) ?? (content.stats as StatItem[]) ?? [];
  return (
    <section style={{ background: colors.primary, fontFamily: colors.font }} className="py-14 md:py-20 px-4 md:px-8">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            {item.icon && <div className="text-2xl mb-2">{item.icon}</div>}
            <div style={{ color: colors.onPrimary }} className="text-3xl sm:text-4xl md:text-5xl font-black">{item.value ?? item.number ?? ''}</div>
            <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="mt-1.5 text-xs sm:text-sm font-semibold uppercase tracking-widest">{item.label ?? item.title ?? ''}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section: Pricing ────────────────────────────────────────────
interface PricingItem { name?: string; title?: string; price?: string | number; period?: string; description?: string; features?: string[]; cta?: string; popular?: boolean; }

function Pricing({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Tariflar');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: PricingItem[] = (content.items as PricingItem[]) ?? (content.plans as PricingItem[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base max-w-xl mx-auto">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((item, i) => (
            <div key={i}
              style={item.popular
                ? { background: colors.primary, border: `2px solid ${colors.primary}`, color: colors.onPrimary }
                : { background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.text }}
              className="p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col relative">
              {item.popular && (
                <div style={{ background: colors.accent, color: '#fff' }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                  ⭐ Top
                </div>
              )}
              <h3 className="text-base md:text-lg font-bold">{item.name ?? item.title ?? ''}</h3>
              <div className="mt-3 text-3xl md:text-4xl font-black">
                {item.price ?? ''}
                {item.period && <span className="text-sm font-normal opacity-60 ml-1">/{item.period}</span>}
              </div>
              <p className="mt-2 text-sm opacity-70 flex-1">{item.description ?? ''}</p>
              {Array.isArray(item.features) && item.features.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {item.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm">
                      <span style={{ color: item.popular ? colors.onPrimary : colors.accent }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
              <a href="#contact"
                style={item.popular
                  ? { background: colors.onPrimary, color: colors.primary }
                  : { background: colors.primary, color: colors.onPrimary }}
                className="mt-6 text-center px-5 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                {item.cta ?? 'Tanlash'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Contact ────────────────────────────────────────────
function Contact({ content, colors }: SectionProps) {
  const title    = String(content.title ?? "Bog'lanish");
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const email    = content.email   ? String(content.email)   : '';
  const phone    = content.phone   ? String(content.phone)   : '';
  const address  = content.address ? String(content.address) : '';
  const hours    = content.workingHours ? String(content.workingHours) : '';
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }} className="p-6 rounded-2xl space-y-4">
            {email && (
              <div>
                <div style={{ color: colors.mutedText }} className="text-xs font-semibold uppercase tracking-wider mb-1">Email</div>
                <a href={`mailto:${email}`} style={{ color: colors.primary }} className="font-semibold text-sm break-all hover:underline">{email}</a>
              </div>
            )}
            {phone && (
              <div>
                <div style={{ color: colors.mutedText }} className="text-xs font-semibold uppercase tracking-wider mb-1">Telefon</div>
                <a href={`tel:${phone}`} style={{ color: colors.primary }} className="font-semibold text-sm hover:underline">{phone}</a>
              </div>
            )}
            {address && (
              <div>
                <div style={{ color: colors.mutedText }} className="text-xs font-semibold uppercase tracking-wider mb-1">Manzil</div>
                <p style={{ color: colors.text }} className="text-sm">{address}</p>
              </div>
            )}
            {hours && (
              <div>
                <div style={{ color: colors.mutedText }} className="text-xs font-semibold uppercase tracking-wider mb-1">Ish vaqti</div>
                <p style={{ color: colors.text }} className="text-sm">{hours}</p>
              </div>
            )}
          </div>
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }} className="p-6 rounded-2xl">
            <div className="space-y-3">
              <input placeholder="Ismingiz" style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text }} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-offset-0" />
              <input placeholder="Email" style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text }} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" />
              <textarea rows={4} placeholder="Xabar..." style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text }} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" />
              <button style={{ background: colors.primary, color: colors.onPrimary }} className="w-full py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">Yuborish</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: About ──────────────────────────────────────────────
function About({ content, colors }: SectionProps) {
  const title    = String(content.title ?? content.heading ?? 'Biz haqimizda');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const desc     = String(content.description ?? content.text ?? '');
  const mission  = content.mission ? String(content.mission) : '';
  const values: Array<{ title?: string; text?: string }> = (content.values as Array<{ title?: string; text?: string }>) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
            {subtitle && <p style={{ color: colors.primary }} className="mt-2 font-semibold text-sm sm:text-base">{subtitle}</p>}
            {desc && <p style={{ color: colors.mutedText }} className="mt-4 text-sm sm:text-base leading-relaxed">{desc}</p>}
            {mission && <p style={{ color: colors.mutedText }} className="mt-3 text-sm leading-relaxed">{mission}</p>}
          </div>
          {values.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {values.map((v, i) => (
                <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }} className="p-4 rounded-xl">
                  <h4 style={{ color: colors.primary }} className="font-bold text-sm">{v.title ?? ''}</h4>
                  <p style={{ color: colors.mutedText }} className="mt-1 text-xs leading-relaxed">{v.text ?? ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Section: Testimonials ───────────────────────────────────────
interface TestimonialItem { name?: string; role?: string; company?: string; text?: string; rating?: number; }

function Testimonials({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Mijozlar fikri');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: TestimonialItem[] = (content.items as TestimonialItem[]) ?? [];
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }} className="p-5 md:p-6 rounded-2xl flex flex-col">
              {item.rating && <div className="text-amber-400 text-sm mb-3">{'★'.repeat(Math.min(5, item.rating))}</div>}
              <p style={{ color: colors.text }} className="text-sm leading-relaxed flex-1 italic">&ldquo;{item.text ?? ''}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <div style={{ background: colors.primary, color: colors.onPrimary }} className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                  {(item.name ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color: colors.text }} className="font-bold text-sm">{item.name ?? ''}</div>
                  <div style={{ color: colors.mutedText }} className="text-xs">{[item.role, item.company].filter(Boolean).join(', ')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Team ───────────────────────────────────────────────
interface TeamItem { name?: string; role?: string; bio?: string; }

function Team({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Jamoa');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: TeamItem[] = (content.items as TeamItem[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {items.map((item, i) => (
            <div key={i} className="text-center">
              <div style={{ background: colors.primary, color: colors.onPrimary }} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto flex items-center justify-center font-black text-xl sm:text-2xl">
                {(item.name ?? '?')[0].toUpperCase()}
              </div>
              <div style={{ color: colors.text }} className="mt-3 font-bold text-sm">{item.name ?? ''}</div>
              <div style={{ color: colors.primary }} className="text-xs font-semibold mt-0.5">{item.role ?? ''}</div>
              {item.bio && <p style={{ color: colors.mutedText }} className="mt-1.5 text-xs leading-relaxed">{item.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: FAQ ────────────────────────────────────────────────
interface FaqItem { question?: string; answer?: string; }

function Faq({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Ko\'p so\'raladigan savollar');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: FaqItem[] = (content.items as FaqItem[]) ?? [];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }} className="rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 md:p-5 text-left gap-4">
                <span style={{ color: colors.text }} className="font-semibold text-sm md:text-base">{item.question ?? ''}</span>
                <span style={{ color: colors.primary }} className="text-lg shrink-0">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div style={{ color: colors.mutedText }} className="px-4 md:px-5 pb-4 md:pb-5 text-sm leading-relaxed">{item.answer ?? ''}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Menu (restoran) ────────────────────────────────────
interface MenuItem { name?: string; price?: string | number; description?: string; vegetarian?: boolean; }
interface MenuCategory { name?: string; items?: MenuItem[]; }

function Menu({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Menyu');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const categories: MenuCategory[] = (content.categories as MenuCategory[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        {categories.map((cat, ci) => (
          <div key={ci} className="mb-10">
            <h3 style={{ color: colors.primary, borderBottom: `2px solid ${colors.primary}33` }} className="text-lg font-black pb-2 mb-4">{cat.name ?? ''}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(cat.items ?? []).map((item, ii) => (
                <div key={ii} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }} className="flex items-start justify-between p-4 rounded-xl gap-3">
                  <div className="flex-1 min-w-0">
                    <div style={{ color: colors.text }} className="font-semibold text-sm">{item.name ?? ''}</div>
                    {item.description && <p style={{ color: colors.mutedText }} className="text-xs mt-0.5 leading-relaxed">{item.description}</p>}
                    {item.vegetarian && <span style={{ color: '#16a34a' }} className="text-xs mt-1 inline-block">🌱 Vegetarian</span>}
                  </div>
                  {item.price && <div style={{ color: colors.primary }} className="font-black text-sm shrink-0">{item.price}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section: CTA ────────────────────────────────────────────────
function Cta({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Boshlash vaqti keldi');
  const desc  = content.description ? String(content.description) : '';
  const cta   = String(content.ctaText ?? 'Bepul sinab ko\'rish');
  const badge = content.badge ? String(content.badge) : '';
  return (
    <section style={{ background: colors.primary, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8 text-center">
      {badge && <span style={{ background: colors.onPrimary + '25', color: colors.onPrimary }} className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{badge}</span>}
      <h2 style={{ color: colors.onPrimary }} className="text-2xl sm:text-3xl md:text-4xl font-black max-w-2xl mx-auto">{title}</h2>
      {desc && <p style={{ color: colors.onPrimary, opacity: 0.75 }} className="mt-4 text-sm sm:text-base max-w-xl mx-auto">{desc}</p>}
      <a href={String(content.ctaLink ?? '#contact')}
        style={{ background: colors.onPrimary, color: colors.primary }}
        className="inline-block mt-8 px-8 py-4 rounded-2xl font-black text-sm shadow-2xl hover:opacity-90 transition-opacity">
        {cta}
      </a>
    </section>
  );
}

// ── Section: Gallery ────────────────────────────────────────────
function Gallery({ content, colors }: SectionProps) {
  const title = String(content.title ?? 'Galereya');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: Array<{ src?: string; alt?: string; caption?: string }> = (content.items as Array<{ src?: string; alt?: string; caption?: string }>) ?? [];
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.length > 0 ? items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
              className="aspect-square rounded-xl overflow-hidden flex items-center justify-center text-2xl">
              {item.src ? (
                <img src={item.src} alt={item.alt ?? ''} className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: colors.mutedText }}>🖼️</span>
              )}
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
              className="aspect-square rounded-xl flex items-center justify-center">
              <span style={{ color: colors.mutedText }} className="text-2xl">🖼️</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Fallback for unknown types ──────────────────────────────────
function UnknownSection({ type, colors }: { type: string; colors: Colors }) {
  return (
    <div style={{ border: `1px dashed ${colors.cardBorder}`, color: colors.mutedText, fontFamily: colors.font }}
      className="py-10 px-6 text-center m-6 rounded-3xl text-sm">
      Bo&apos;lim: {type}
    </div>
  );
}

// ── Section map ────────────────────────────────────────────────

const SECTION_MAP: Record<string, React.FC<SectionProps>> = {
  hero: Hero,
  features: Features,
  services: Features,
  stats: Stats,
  pricing: Pricing,
  contact: Contact,
  about: About,
  testimonials: Testimonials,
  team: Team,
  faq: Faq,
  menu: Menu,
  cta: Cta,
  gallery: Gallery,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const siteName = String(schema?.siteName ?? schema?.name ?? '');
  const allSectionTypes = pages.flatMap(p => (p.sections ?? []).map(s => s.type ?? ''));
  const colors = useColors(
    schema?.settings as SiteSettings | undefined,
    siteName,
    allSectionTypes,
  );

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

  const activePage = pages.find((p) => p.slug === activeSlug) ?? pages[0];
  const sections = activePage.sections ?? [];
  const isMultiPage = pages.length > 1;
  const pageLabel = (p: Page, idx: number) =>
    p.title || (p.slug ? p.slug.replace(/-/g, ' ') : `Sahifa ${idx + 1}`);

  type NavLink = { label: string; href?: string; onClick: () => void; active: boolean };
  const navLinks: NavLink[] = isMultiPage
    ? pages.map((p, idx) => ({ label: pageLabel(p, idx), onClick: () => { setActiveSlug(p.slug ?? `page-${idx}`); setMobileMenuOpen(false); }, active: p.slug === activePage.slug }))
    : sections.filter(s => s.id).map(s => ({ label: s.type, href: `#${s.id}`, onClick: () => setMobileMenuOpen(false), active: false }));

  return (
    <div style={{ background: colors.bg, fontFamily: colors.font }} className="w-full">
      {/* ── Responsive Navbar ───────────────────────────────── */}
      {(siteName || navLinks.length > 0) && (
        <nav style={{ background: colors.bg + 'f0', borderBottom: `1px solid ${colors.cardBorder}` }}
          className="sticky top-0 z-20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14 md:h-16">
            {/* Brand */}
            <span style={{ color: colors.text }} className="font-black text-base md:text-lg tracking-tight">{siteName}</span>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link, i) => (
                link.href ? (
                  <a key={i} href={link.href} onClick={link.onClick}
                    style={{ color: link.active ? colors.primary : colors.mutedText }}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity capitalize">
                    {link.label}
                  </a>
                ) : (
                  <button key={i} type="button" onClick={link.onClick}
                    style={link.active
                      ? { background: colors.primary, color: colors.onPrimary }
                      : { color: colors.mutedText }}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity capitalize">
                    {link.label}
                  </button>
                )
              ))}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg"
              style={{ color: colors.text }}
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <span style={{ background: colors.text }} className={`block w-5 h-0.5 transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span style={{ background: colors.text }} className={`block w-5 h-0.5 transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span style={{ background: colors.text }} className={`block w-5 h-0.5 transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div style={{ background: colors.bg, borderTop: `1px solid ${colors.cardBorder}` }}
              className="md:hidden px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link, i) => (
                link.href ? (
                  <a key={i} href={link.href} onClick={link.onClick}
                    style={{ color: link.active ? colors.primary : colors.text }}
                    className="px-3 py-2.5 rounded-xl text-sm font-semibold capitalize">
                    {link.label}
                  </a>
                ) : (
                  <button key={i} type="button" onClick={link.onClick}
                    style={link.active
                      ? { background: colors.primary + '18', color: colors.primary }
                      : { color: colors.text }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold capitalize">
                    {link.label}
                  </button>
                )
              ))}
            </div>
          )}
        </nav>
      )}

      {/* ── Sections ────────────────────────────────────────── */}
      {sections.map((section, i) => {
        const Component = SECTION_MAP[section.type?.toLowerCase() ?? ''];
        const content: SectionContent = (section.content as SectionContent) ?? {};
        const key = section.id ?? `${section.type}-${i}`;
        if (!Component) {
          return <UnknownSection key={key} type={section.type} colors={colors} />;
        }
        return (
          <div key={key} id={section.id}>
            <Component content={content} colors={colors} />
          </div>
        );
      })}

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={{ background: colors.primary, color: colors.onPrimary, fontFamily: colors.font }} className="py-8 px-4 text-center text-sm opacity-90">
        © {new Date().getFullYear()} {siteName || ''}
        {siteName && (
          <div style={{ opacity: 0.55 }} className="mt-1 text-xs">
            Barcha huquqlar himoyalangan
          </div>
        )}
      </footer>
    </div>
  );
});
