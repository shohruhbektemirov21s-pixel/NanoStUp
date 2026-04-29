'use client';

import React, { useEffect, useState } from 'react';

// ── Global stillar (animatsiya, hover, soya — barcha sayt uchun) ──
function SiteStyles({ primary, accent }: { primary: string; accent: string }) {
  return (
    <style>{`
      @keyframes ns-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ns-blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -40px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.95); } }
      @keyframes ns-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .ns-fade-up { animation: ns-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
      .ns-d-1 { animation-delay: 0.05s; } .ns-d-2 { animation-delay: 0.12s; }
      .ns-d-3 { animation-delay: 0.20s; } .ns-d-4 { animation-delay: 0.28s; }
      .ns-d-5 { animation-delay: 0.36s; } .ns-d-6 { animation-delay: 0.44s; }
      .ns-card { transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s, border-color 0.3s; }
      .ns-card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px -12px rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.06); }
      .ns-blob { position: absolute; border-radius: 9999px; filter: blur(60px); opacity: 0.5; pointer-events: none; animation: ns-blob 22s ease-in-out infinite; }
      .ns-btn-primary { display: inline-flex; align-items: center; gap: 0.55rem; transition: transform 0.2s, box-shadow 0.25s, opacity 0.2s; box-shadow: 0 6px 18px -4px ${primary}55, 0 2px 6px -2px rgba(0,0,0,0.1); }
      .ns-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -6px ${primary}88, 0 4px 10px -2px rgba(0,0,0,0.12); }
      .ns-btn-primary:active { transform: translateY(0); }
      .ns-btn-ghost { display: inline-flex; align-items: center; gap: 0.55rem; transition: background 0.2s, transform 0.2s; }
      .ns-btn-ghost:hover { transform: translateY(-2px); }
      .ns-arrow { transition: transform 0.25s; display: inline-block; }
      .ns-btn-primary:hover .ns-arrow, .ns-btn-ghost:hover .ns-arrow { transform: translateX(4px); }
      .ns-grain { background-image: radial-gradient(circle at 1px 1px, ${primary}11 1px, transparent 0); background-size: 20px 20px; }
      .ns-display { letter-spacing: -0.025em; line-height: 1.05; }
      .ns-eyebrow { letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; font-size: 0.7rem; }
      @media (prefers-reduced-motion: reduce) { .ns-fade-up, .ns-blob { animation: none !important; } .ns-card:hover { transform: none; } }
    `}</style>
  );
}

// Hook: navbar scroll holatini kuzatish
function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

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

interface SiteDesign {
  style?: string;
  layoutPattern?: string;
  mood?: string;
  density?: string;
  cornerRadius?: string;
  animation?: string;
}

interface SiteSchema {
  siteName?: string;
  settings?: SiteSettings;
  design?: SiteDesign;
  pages?: Page[];
  [key: string]: unknown;
}

// ── Design system helpers ──────────────────────────────────────

const DESIGN_STYLES_FE = ['minimal','luxury','startup','dark','glassmorphism','editorial','playful','corporate','bold-gradient','local-uzbek'] as const;
const LAYOUT_PATTERNS_FE = ['centered-hero','split-hero','image-first-hero','saas-landing','premium-dark','gradient-modern','hero-fullscreen','bold-hero','magazine-layout','editorial','two-column-content','minimal-clean','glassmorphism-card','asymmetric-layout','bold-typography','overlap-cards','hero-with-cards','dashboard-style','local-business','hero-with-sidebar'] as const;
const DENSITIES_FE = ['compact','comfortable','spacious'] as const;
const CORNERS_FE = ['none','small','medium','large','extra'] as const;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick<T>(arr: readonly T[], seed: number): T { return arr[seed % arr.length]; }

function resolveDesign(schema: SiteSchema): SiteDesign {
  if (schema.design && typeof schema.design === 'object') return schema.design;
  const seed = hashStr(String(schema.siteName ?? '') + String(schema.pages?.length ?? 0));
  return {
    style:         pick(DESIGN_STYLES_FE,    seed),
    layoutPattern: pick(LAYOUT_PATTERNS_FE,  seed + 7),
    mood:          'modern',
    density:       pick(DENSITIES_FE,        seed + 3),
    cornerRadius:  pick(CORNERS_FE,          seed + 5),
    animation:     'none',
  };
}

function getRadius(d: SiteDesign): string {
  const map: Record<string, string> = { none:'0px', small:'6px', medium:'12px', large:'20px', extra:'9999px' };
  return map[d.cornerRadius ?? 'medium'] ?? '12px';
}

function getDensityPy(d: SiteDesign): string {
  const map: Record<string, string> = { compact:'py-12 md:py-16', comfortable:'py-16 md:py-24', spacious:'py-20 md:py-32' };
  return map[d.density ?? 'comfortable'] ?? 'py-16 md:py-24';
}

function heroVariant(d: SiteDesign): 'centered' | 'split' | 'fullscreen' {
  const lp = d.layoutPattern ?? '';
  const split = ['split-hero','two-column-content','hero-with-sidebar','magazine-layout','asymmetric-layout'];
  const full  = ['image-first-hero','premium-dark','gradient-modern','hero-fullscreen','bold-hero','glassmorphism-card','bold-typography'];
  if (split.includes(lp)) return 'split';
  if (full.includes(lp))  return 'fullscreen';
  return 'centered';
}

function featuresVariant(d: SiteDesign): 'grid' | 'list' | 'timeline' {
  const style = d.style ?? '';
  if (['minimal','corporate'].includes(style)) return 'list';
  if (['luxury','editorial'].includes(style))  return 'timeline';
  return 'grid';
}

function pricingVariant(d: SiteDesign): 'cards' | 'minimal' {
  if (['minimal','corporate','editorial'].includes(d.style ?? '')) return 'minimal';
  return 'cards';
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
type SectionProps = { content: SectionContent; colors: Colors; design: SiteDesign };

// ── Section: Hero (3 variants: centered | split | fullscreen) ────────
function Hero({ content, colors, design }: SectionProps) {
  const title    = String(content.title    ?? content.heading  ?? 'Xush kelibsiz');
  const subtitle = String(content.subtitle ?? '');
  const desc     = String(content.description ?? '');
  const cta      = String(content.ctaText  ?? content.cta ?? content.button ?? '');
  const cta2     = String(content.cta2Text ?? content.secondaryCta ?? '');
  const badge    = content.badge ? String(content.badge) : '';
  const v        = heroVariant(design);
  const r        = getRadius(design);
  const py       = getDensityPy(design);

  const Badge = badge ? (
    <span style={{ background: colors.primary + '22', color: colors.primary, border: `1px solid ${colors.primary}44`, borderRadius: r }}
      className="inline-block mb-4 px-3 py-1 text-xs font-bold tracking-wider uppercase">{badge}</span>
  ) : null;

  // CTA tugmalar — strelka bilan, soya bilan
  const Arrow = <span className="ns-arrow">→</span>;
  const PrimaryBtn = cta ? (
    <a href={String(content.ctaLink ?? '#contact')}
      style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }}
      className="ns-btn-primary px-7 py-3.5 font-bold text-sm">
      {cta} {Arrow}
    </a>
  ) : null;
  const GhostBtn = cta2 ? (
    <a href="#"
      style={{ border: `1.5px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r, background: 'transparent' }}
      className="ns-btn-ghost px-7 py-3.5 font-bold text-sm">
      {cta2}
    </a>
  ) : null;
  const RichCtas = (cta || cta2) ? (
    <div className="mt-9 flex flex-wrap gap-3 items-center">{PrimaryBtn}{GhostBtn}</div>
  ) : null;

  // Gradient mesh fon (har Hero uchun foydalanish mumkin)
  const MeshBg = (
    <>
      <div className="ns-blob" style={{ background: colors.primary, width: '420px', height: '420px', top: '-120px', left: '-120px' }} />
      <div className="ns-blob" style={{ background: colors.accent, width: '380px', height: '380px', bottom: '-100px', right: '-80px', animationDelay: '7s' }} />
      <div className="absolute inset-0 ns-grain opacity-50" />
    </>
  );

  if (v === 'split') {
    // Vizual blok — 3 qatlamli abstrakt: katta gradient doira + kichik card + accent halqa
    const VisualBlock = (
      <div className="relative aspect-square md:aspect-[4/5] w-full">
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, borderRadius: r }}
          className="absolute inset-0 ns-fade-up ns-d-2" />
        <div style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r, boxShadow: '0 20px 50px -10px rgba(0,0,0,0.18)' }}
          className="absolute bottom-6 left-6 right-12 p-5 ns-fade-up ns-d-3">
          <div style={{ color: colors.mutedText }} className="text-[10px] font-bold uppercase tracking-widest">★★★★★</div>
          <p style={{ color: colors.text }} className="mt-1.5 text-sm font-semibold leading-snug">
            {subtitle || "Mijozlarimiz biz bilan ishonchli xizmat oladilar"}
          </p>
        </div>
        <div style={{ border: `2px solid ${colors.bg}`, background: colors.accent, borderRadius: '9999px' }}
          className="absolute top-4 right-4 w-16 h-16 flex items-center justify-center text-2xl shadow-lg ns-fade-up ns-d-4">
          ✨
        </div>
      </div>
    );
    return (
      <section style={{ background: colors.bg, color: colors.text, fontFamily: colors.font }} className={`${py} px-4 md:px-8 relative overflow-hidden`}>
        {MeshBg}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative">
          <div className="ns-fade-up">
            {Badge}
            <h1 style={{ color: colors.text }} className="ns-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black">{title}</h1>
            {subtitle && <p style={{ color: colors.primary }} className="mt-4 text-lg sm:text-xl font-semibold">{subtitle}</p>}
            {desc && <p style={{ color: colors.mutedText }} className="mt-5 text-base sm:text-lg leading-relaxed max-w-xl">{desc}</p>}
            {RichCtas}
          </div>
          {VisualBlock}
        </div>
      </section>
    );
  }

  if (v === 'fullscreen') {
    return (
      <section style={{ background: colors.primary, fontFamily: colors.font }}
        className={`${py} px-4 md:px-8 text-center relative overflow-hidden`}>
        {/* Mesh blobs (oq tomonida) */}
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 75% 25%, ${colors.accent}55, transparent 50%), radial-gradient(circle at 20% 80%, ${colors.onPrimary}22, transparent 45%)` }} />
        <div className="absolute inset-0 ns-grain opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto">
          {badge && (
            <span style={{ background: 'rgba(255,255,255,0.15)', color: colors.onPrimary, border: '1px solid rgba(255,255,255,0.3)', borderRadius: r, backdropFilter: 'blur(8px)' }}
              className="ns-fade-up inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-xs font-bold tracking-wider uppercase">
              <span style={{ background: colors.onPrimary }} className="w-1.5 h-1.5 rounded-full animate-pulse" />
              {badge}
            </span>
          )}
          <h1 style={{ color: colors.onPrimary }} className="ns-display ns-fade-up ns-d-1 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black">{title}</h1>
          {subtitle && <p style={{ color: colors.onPrimary, opacity: 0.85 }} className="ns-fade-up ns-d-2 mt-6 text-xl sm:text-2xl font-semibold">{subtitle}</p>}
          {desc && <p style={{ color: colors.onPrimary, opacity: 0.7 }} className="ns-fade-up ns-d-3 mt-5 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">{desc}</p>}
          {(cta || cta2) && (
            <div className="ns-fade-up ns-d-4 mt-10 flex flex-wrap gap-4 justify-center">
              {cta && <a href={String(content.ctaLink ?? '#contact')}
                style={{ background: colors.onPrimary, color: colors.primary, borderRadius: r, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.4)' }}
                className="ns-btn-primary px-9 py-4 font-black text-sm">{cta} <span className="ns-arrow">→</span></a>}
              {cta2 && <a href="#"
                style={{ border: `1.5px solid ${colors.onPrimary}66`, color: colors.onPrimary, borderRadius: r, backdropFilter: 'blur(8px)' }}
                className="ns-btn-ghost px-9 py-4 font-bold text-sm bg-transparent">{cta2}</a>}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Centered variant
  return (
    <section style={{ background: colors.bg, color: colors.text, fontFamily: colors.font }}
      className={`${py} px-4 md:px-8 text-center relative overflow-hidden`}>
      {MeshBg}
      <div className="relative z-10 max-w-5xl mx-auto">
        {Badge}
        <h1 style={{ color: colors.text }}
          className="ns-display ns-fade-up text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black max-w-4xl mx-auto">
          {title}
        </h1>
        {subtitle && <p style={{ color: colors.primary }} className="ns-fade-up ns-d-1 mt-5 text-lg sm:text-xl font-semibold max-w-2xl mx-auto">{subtitle}</p>}
        {desc && <p style={{ color: colors.mutedText }} className="ns-fade-up ns-d-2 mt-5 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">{desc}</p>}
        <div className="ns-fade-up ns-d-3 flex flex-col sm:flex-row gap-3 justify-center items-center">{RichCtas}</div>
      </div>
    </section>
  );
}

// ── Section: Features / Services (3 variants: grid | list | timeline) ───
interface ListItem { title?: string; name?: string; desc?: string; description?: string; text?: string; icon?: string; price?: string | number; }

function Features({ content, colors, design }: SectionProps) {
  const title    = String(content.title ?? 'Xizmatlarimiz');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: ListItem[] = (content.items as ListItem[]) ?? (content.features as ListItem[]) ?? [];
  const v  = featuresVariant(design);
  const r  = getRadius(design);
  const py = getDensityPy(design);
  const count = items.length;
  const cols = count <= 2 ? 'grid-cols-1 sm:grid-cols-2' : count === 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const Header = (
    <div className="text-center mb-10 md:mb-14">
      <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
      {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base max-w-xl mx-auto">{subtitle}</p>}
    </div>
  );

  if (v === 'list') {
    return (
      <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-3xl mx-auto">
          {Header}
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
                className="flex items-start gap-4 p-4 md:p-5">
                <div style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r, minWidth: '2.25rem' }}
                  className="w-9 h-9 flex items-center justify-center text-sm font-black shrink-0">
                  {item.icon ?? String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <h3 style={{ color: colors.text }} className="font-bold text-sm md:text-base">{item.title ?? item.name ?? ''}</h3>
                  <p style={{ color: colors.mutedText }} className="mt-1 text-xs sm:text-sm leading-relaxed">{item.desc ?? item.description ?? item.text ?? ''}</p>
                  {item.price && <span style={{ color: colors.primary }} className="mt-1 inline-block font-black text-sm">{item.price}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (v === 'timeline') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-3xl mx-auto">
          {Header}
          <div className="relative">
            <div style={{ background: colors.primary + '33' }} className="absolute left-4 top-0 bottom-0 w-0.5 md:left-6" />
            <div className="space-y-6 md:space-y-8">
              {items.map((item, i) => (
                <div key={i} className="flex gap-6 md:gap-10 items-start relative pl-10 md:pl-16">
                  <div style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }}
                    className="absolute left-0 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center font-black text-sm md:text-base shrink-0">
                    {item.icon ?? (i + 1)}
                  </div>
                  <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
                    className="flex-1 p-4 md:p-6">
                    <h3 style={{ color: colors.text }} className="font-bold text-sm md:text-base">{item.title ?? item.name ?? ''}</h3>
                    <p style={{ color: colors.mutedText }} className="mt-1 text-xs sm:text-sm leading-relaxed">{item.desc ?? item.description ?? item.text ?? ''}</p>
                    {item.price && <span style={{ color: colors.primary }} className="mt-2 inline-block font-black text-sm">{item.price}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        {Header}
        <div className={`grid ${cols} gap-5 md:gap-6`}>
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
              className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-6 md:p-8`}>
              {item.icon && (
                <div style={{ background: `${colors.primary}15`, color: colors.primary, borderRadius: r }}
                  className="w-12 h-12 flex items-center justify-center text-xl mb-4">
                  {item.icon}
                </div>
              )}
              <h3 style={{ color: colors.text }} className="text-base md:text-lg font-bold leading-snug">{item.title ?? item.name ?? ''}</h3>
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

function Stats({ content, colors, design: _d }: SectionProps) {
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

function Pricing({ content, colors, design }: SectionProps) {
  const title = String(content.title ?? 'Tariflar');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: PricingItem[] = (content.items as PricingItem[]) ?? (content.plans as PricingItem[]) ?? [];
  const v  = pricingVariant(design);
  const r  = getRadius(design);
  const py = getDensityPy(design);

  const Header = (
    <div className="text-center mb-10 md:mb-14">
      <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
      {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base max-w-xl mx-auto">{subtitle}</p>}
    </div>
  );

  if (v === 'minimal') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-2xl mx-auto">
          {Header}
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} style={{ border: `1px solid ${item.popular ? colors.primary : colors.cardBorder}`, borderRadius: r }}
                className="flex items-center justify-between p-4 md:p-5 gap-4">
                <div className="flex-1">
                  <span style={{ color: colors.text }} className="font-bold text-sm">{item.name ?? item.title ?? ''}</span>
                  {item.description && <p style={{ color: colors.mutedText }} className="text-xs mt-0.5">{item.description}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span style={{ color: colors.primary }} className="font-black text-lg">{item.price ?? ''}</span>
                  <a href="#contact" style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }}
                    className="px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity">
                    {item.cta ?? 'Tanlash'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        {Header}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((item, i) => (
            <div key={i}
              style={item.popular
                ? { background: colors.primary, border: `2px solid ${colors.primary}`, color: colors.onPrimary, borderRadius: r, boxShadow: `0 24px 50px -12px ${colors.primary}50` }
                : { background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r }}
              className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-7 md:p-9 flex flex-col relative ${item.popular ? 'md:scale-105' : ''}`}>
              {item.popular && (
                <div style={{ background: colors.accent, color: '#fff', borderRadius: r }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold whitespace-nowrap">
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
                  ? { background: colors.onPrimary, color: colors.primary, borderRadius: r }
                  : { background: colors.primary, color: colors.onPrimary, borderRadius: r }}
                className="mt-6 text-center px-5 py-3 font-bold text-sm hover:opacity-90 transition-opacity">
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
function Contact({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="p-6 space-y-4">
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
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="p-6">
            <div className="space-y-3">
              <input placeholder="Ismingiz" style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r }} className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-offset-0" />
              <input placeholder="Email" style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r }} className="w-full px-4 py-2.5 text-sm outline-none" />
              <textarea rows={4} placeholder="Xabar..." style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r }} className="w-full px-4 py-2.5 text-sm outline-none resize-none" />
              <button style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }} className="w-full py-3 font-bold text-sm hover:opacity-90 transition-opacity">Yuborish</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: About ──────────────────────────────────────────────
function About({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
                <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="p-4">
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

function Testimonials({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-6 md:p-7 flex flex-col relative`}>
              <div style={{ color: colors.primary, opacity: 0.15 }} className="absolute top-4 right-5 text-5xl font-serif leading-none select-none">“</div>
              {item.rating && <div className="text-amber-400 text-sm mb-3">{'★'.repeat(Math.min(5, item.rating))}</div>}
              <p style={{ color: colors.text }} className="text-sm md:text-[15px] leading-relaxed flex-1 relative">{item.text ?? ''}</p>
              <div className="mt-5 pt-5 flex items-center gap-3" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.onPrimary }} className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0">
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

function Team({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
              <div style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center font-black text-xl sm:text-2xl">
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

function Faq({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${open === i ? colors.primary + '55' : colors.cardBorder}`, borderRadius: r }} className={`ns-fade-up ns-d-${Math.min(i + 1, 6)} overflow-hidden transition-colors`}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 md:p-6 text-left gap-4">
                <span style={{ color: colors.text }} className="font-semibold text-sm md:text-base">{item.question ?? ''}</span>
                <span style={{ background: open === i ? colors.primary : `${colors.primary}18`, color: open === i ? colors.onPrimary : colors.primary, borderRadius: '9999px' }}
                  className="w-7 h-7 flex items-center justify-center text-base shrink-0 transition">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div style={{ color: colors.mutedText }} className="px-5 md:px-6 pb-5 md:pb-6 text-sm md:text-[15px] leading-relaxed">{item.answer ?? ''}</div>}
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

function Menu({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
                <div key={ii} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="flex items-start justify-between p-4 gap-3">
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
function Cta({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
        style={{ background: colors.onPrimary, color: colors.primary, borderRadius: r }}
        className="inline-block mt-8 px-8 py-4 font-black text-sm shadow-2xl hover:opacity-90 transition-opacity">
        {cta}
      </a>
    </section>
  );
}

// ── Section: Gallery ────────────────────────────────────────────
function Gallery({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
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
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
              className="aspect-square overflow-hidden flex items-center justify-center text-2xl">
              {item.src ? (
                <img src={item.src} alt={item.alt ?? ''} className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: colors.mutedText }}>🖼️</span>
              )}
            </div>
          )) : Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
              className="aspect-square flex items-center justify-center">
              <span style={{ color: colors.mutedText }} className="text-2xl">🖼️</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Blog ───────────────────────────────────────────────
interface BlogPost { title?: string; excerpt?: string; description?: string; author?: string; date?: string; category?: string; image?: string; thumbnail?: string; readTime?: string; link?: string; }
function Blog({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? 'Blog');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items = (content.items as BlogPost[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <article key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} overflow-hidden flex flex-col group`}>
              {(it.image || it.thumbnail) && <div className="overflow-hidden"><img src={it.image || it.thumbnail} alt={it.title ?? ''} className="w-full h-52 object-cover transition-transform duration-700 group-hover:scale-110" /></div>}
              <div className="p-5 flex-1 flex flex-col">
                {it.category && <span style={{ background: `${colors.accent}22`, color: colors.accent }} className="self-start mb-2 px-2 py-0.5 text-[10px] rounded-md font-semibold">{it.category}</span>}
                <h3 style={{ color: colors.text }} className="font-bold text-base md:text-lg mb-2">{it.title}</h3>
                <p style={{ color: colors.mutedText }} className="text-sm leading-relaxed mb-4 flex-1">{it.excerpt || it.description}</p>
                <div style={{ color: colors.mutedText }} className="flex items-center justify-between text-xs">
                  <span>{it.author}</span>
                  <span>{it.date}{it.readTime ? ` · ${it.readTime}` : ''}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Products (e-commerce) ──────────────────────────────
interface Product { name?: string; title?: string; price?: string | number; oldPrice?: string | number; image?: string; category?: string; rating?: number; inStock?: boolean; link?: string; badge?: string; }
function Products({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? 'Mahsulotlar');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items = (content.items as Product[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} overflow-hidden flex flex-col group`}>
              <div className="relative overflow-hidden">
                {it.image
                  ? <img src={it.image} alt={String(it.name ?? '')} className="w-full h-52 object-cover transition-transform duration-700 group-hover:scale-110" />
                  : <div style={{ background: `${colors.accent}22` }} className="w-full h-48" />}
                {(it.badge || it.oldPrice) && <span style={{ background: colors.primary, color: colors.onPrimary }} className="absolute top-3 left-3 px-2 py-1 text-[10px] rounded-md font-bold">{it.badge ?? 'YANGI'}</span>}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                {it.category && <span style={{ color: colors.mutedText }} className="text-[11px] mb-1">{it.category}</span>}
                <h3 style={{ color: colors.text }} className="font-bold text-sm md:text-base mb-1">{it.name || it.title}</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span style={{ color: colors.primary }} className="font-black text-base md:text-lg">{String(it.price ?? '')}</span>
                  {it.oldPrice && <span style={{ color: colors.mutedText }} className="text-xs line-through">{String(it.oldPrice)}</span>}
                </div>
                <a href={it.link ?? '#contact'} style={{ background: colors.primary, color: colors.onPrimary }} className="mt-auto block text-center px-3 py-2 rounded-lg text-xs font-bold transition hover:opacity-90">Savatga</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Portfolio ──────────────────────────────────────────
interface PortfolioItem { title?: string; category?: string; image?: string; description?: string; link?: string; client?: string; }
function Portfolio({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? 'Portfolio');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items = (content.items as PortfolioItem[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <a key={i} href={it.link ?? '#contact'} style={{ background: colors.cardBg, borderRadius: r }} className="group block overflow-hidden relative">
              {it.image
                ? <img src={it.image} alt={it.title ?? ''} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500" />
                : <div style={{ background: `${colors.accent}33` }} className="w-full h-64" />}
              <div style={{ background: `linear-gradient(to top, ${colors.text}cc, transparent)` }} className="absolute inset-0 flex flex-col justify-end p-5">
                {it.category && <span style={{ background: colors.accent, color: colors.onPrimary }} className="self-start mb-2 px-2 py-0.5 text-[10px] rounded-md font-semibold">{it.category}</span>}
                <h3 style={{ color: colors.cardBg }} className="font-bold text-base md:text-lg mb-1">{it.title}</h3>
                {it.description && <p style={{ color: colors.cardBg, opacity: 0.85 }} className="text-xs sm:text-sm">{it.description}</p>}
                {it.client && <span style={{ color: colors.cardBg, opacity: 0.7 }} className="mt-1 text-[11px]">{it.client}</span>}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Properties (real estate) ───────────────────────────
interface PropertyItem { title?: string; price?: string | number; location?: string; bedrooms?: number; bathrooms?: number; area?: string; image?: string; type?: string; link?: string; }
function Properties({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? "Ko'chmas mulk");
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items = (content.items as PropertyItem[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} overflow-hidden group`}>
              <div className="overflow-hidden">
                {it.image
                  ? <img src={it.image} alt={it.title ?? ''} className="w-full h-52 object-cover transition-transform duration-700 group-hover:scale-110" />
                  : <div style={{ background: `linear-gradient(135deg, ${colors.primary}22, ${colors.accent}33)` }} className="w-full h-52" />}
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span style={{ color: colors.primary }} className="font-black text-lg md:text-xl">{String(it.price ?? '')}</span>
                  {it.type && <span style={{ background: `${colors.accent}22`, color: colors.accent }} className="text-[11px] px-2 py-0.5 rounded-md font-semibold">{it.type}</span>}
                </div>
                <h3 style={{ color: colors.text }} className="font-bold text-sm md:text-base mb-1">{it.title}</h3>
                <p style={{ color: colors.mutedText }} className="text-xs mb-3">📍 {it.location}</p>
                <div style={{ color: colors.mutedText }} className="flex items-center gap-3 text-xs">
                  {it.bedrooms != null && <span>🛏 {it.bedrooms}</span>}
                  {it.bathrooms != null && <span>🛁 {it.bathrooms}</span>}
                  {it.area && <span>📐 {it.area}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Booking ────────────────────────────────────────────
interface BookingField { name?: string; label?: string; type?: string; options?: string[]; }
function Booking({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? 'Bron qilish');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const submitText = String(content.submitText ?? content.cta ?? 'Bron qilish');
  const infoText = content.infoText ? String(content.infoText) : '';
  const fields: BookingField[] = (content.fields as BookingField[]) ?? [
    { name: 'name', label: 'Ism', type: 'text' },
    { name: 'phone', label: 'Telefon', type: 'tel' },
    { name: 'date', label: 'Sana', type: 'date' },
    { name: 'time', label: 'Vaqt', type: 'time' },
  ];
  const inputStyle = { background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r };
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <form style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6"
          onSubmit={(e) => { e.preventDefault(); alert('Murojaatingiz qabul qilindi.'); }}>
          {fields.map((f, i) => {
            const span = f.type === 'textarea' ? 'md:col-span-2' : '';
            return (
              <div key={i} className={span}>
                <label style={{ color: colors.mutedText }} className="block text-xs font-semibold mb-1">{f.label || f.name}</label>
                {f.type === 'select' && Array.isArray(f.options)
                  ? <select name={f.name} style={inputStyle} className="w-full px-3 py-2 text-sm">{f.options.map((o, j) => <option key={j}>{o}</option>)}</select>
                  : f.type === 'textarea'
                    ? <textarea name={f.name} rows={3} style={inputStyle} className="w-full px-3 py-2 text-sm" />
                    : <input type={f.type ?? 'text'} name={f.name} style={inputStyle} className="w-full px-3 py-2 text-sm" />}
              </div>
            );
          })}
          <button type="submit" style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }}
            className="md:col-span-2 mt-2 px-6 py-3 font-black text-sm hover:opacity-90 transition">{submitText}</button>
          {infoText && <p style={{ color: colors.mutedText }} className="md:col-span-2 text-xs text-center">{infoText}</p>}
        </form>
      </div>
    </section>
  );
}

// ── Section: Timeline ───────────────────────────────────────────
interface TimelineItem { year?: string; step?: string; title?: string; description?: string; text?: string; icon?: string; }
function Timeline({ content, colors, design }: SectionProps) {
  void design;
  const title = String(content.title ?? 'Bizning tariximiz');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items = (content.items as TimelineItem[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        <div>
          {items.map((it, i) => (
            <div key={i} className="relative pl-12 pb-8 last:pb-0">
              <span style={{ background: colors.primary, color: colors.onPrimary }} className="absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm">
                {it.icon || it.year || it.step || '•'}
              </span>
              {i < items.length - 1 && <span style={{ background: colors.cardBorder }} className="absolute left-[1.05rem] top-9 bottom-0 w-px" />}
              {it.year && <div style={{ color: colors.accent }} className="text-[11px] font-bold mb-1">{it.year}</div>}
              <h3 style={{ color: colors.text }} className="font-bold text-base md:text-lg mb-1">{it.title}</h3>
              <p style={{ color: colors.mutedText }} className="text-sm leading-relaxed">{it.description || it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: Logos ──────────────────────────────────────────────
interface LogoItem { name?: string; logo?: string; image?: string; src?: string; alt?: string; url?: string; }
function Logos({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? 'Bizga ishonadi');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items = (content.items as LogoItem[]) ?? [];
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={{ color: colors.mutedText }} className="text-base md:text-xl font-bold uppercase tracking-wide">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-2 text-xs">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((it, i) => {
            const src = it.logo || it.image || it.src;
            return (
              <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="flex items-center justify-center p-4 h-20">
                {src
                  ? <img src={src} alt={it.alt || it.name || ''} className="max-h-12 max-w-full object-contain opacity-70 hover:opacity-100 transition" />
                  : <span style={{ color: colors.mutedText }} className="font-bold text-sm">{it.name}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Section: Video ──────────────────────────────────────────────
function Video({ content, colors, design }: SectionProps) {
  const r = getRadius(design);
  const title = String(content.title ?? 'Video');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const description = content.description ? String(content.description) : '';
  const ctaText = content.ctaText || content.cta ? String(content.ctaText ?? content.cta) : '';
  const ctaLink = String(content.ctaLink ?? '#contact');
  const videoUrl = String(content.videoUrl ?? content.url ?? '');
  const thumbnail = content.thumbnail || content.poster ? String(content.thumbnail ?? content.poster) : '';
  let embed: React.ReactNode = (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, color: colors.primary, borderRadius: r }} className="w-full aspect-video flex items-center justify-center text-4xl">▶</div>
  );
  if (videoUrl.includes('youtube.com/watch') || videoUrl.includes('youtu.be/')) {
    let vid = '';
    if (videoUrl.includes('v=')) vid = videoUrl.split('v=')[1].split('&')[0];
    else if (videoUrl.includes('youtu.be/')) vid = videoUrl.split('youtu.be/')[1].split('?')[0];
    if (vid) {
      embed = <iframe src={`https://www.youtube.com/embed/${vid}`} allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: r }} className="w-full aspect-video border-0" />;
    }
  } else if (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm')) {
    embed = <video controls poster={thumbnail || undefined} src={videoUrl} style={{ borderRadius: r }} className="w-full aspect-video" />;
  }
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={{ color: colors.text }} className="text-2xl sm:text-3xl md:text-4xl font-black">{title}</h2>
          {subtitle && <p style={{ color: colors.mutedText }} className="mt-3 text-sm sm:text-base">{subtitle}</p>}
        </div>
        {embed}
        {description && <p style={{ color: colors.mutedText }} className="mt-6 text-center text-sm leading-relaxed">{description}</p>}
        {ctaText && (
          <div className="mt-6 text-center">
            <a href={ctaLink} style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }} className="inline-block px-6 py-3 font-black text-sm transition hover:opacity-90">{ctaText}</a>
          </div>
        )}
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
  reviews: Testimonials,
  team: Team,
  faq: Faq,
  menu: Menu,
  cta: Cta,
  gallery: Gallery,
  blog: Blog,
  news: Blog,
  products: Products,
  shop: Products,
  portfolio: Portfolio,
  works: Portfolio,
  properties: Properties,
  listings: Properties,
  booking: Booking,
  reservation: Booking,
  timeline: Timeline,
  history: Timeline,
  logos: Logos,
  clients: Logos,
  brands: Logos,
  video: Video,
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
  const design = schema ? resolveDesign(schema) : {} as SiteDesign;
  const scrolled = useScrolled(40);

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

  // Aloqa ma'lumotlari (footer + navbar uchun)
  const contactSection = pages.flatMap(p => p.sections ?? []).find(s => s.type === 'contact');
  const contactContent = (contactSection?.content as { phone?: string; email?: string; address?: string }) ?? {};

  return (
    <div style={{ background: colors.bg, fontFamily: colors.font }} className="w-full">
      <SiteStyles primary={colors.primary} accent={colors.accent} />
      {/* ── Responsive Navbar ───────────────────────────────── */}
      {(siteName || navLinks.length > 0) && (
        <nav style={{
          background: scrolled ? colors.bg + 'ee' : colors.bg + '00',
          borderBottom: scrolled ? `1px solid ${colors.cardBorder}` : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 20px -6px rgba(0,0,0,0.08)' : 'none',
        }}
          className="sticky top-0 z-20 backdrop-blur-md transition-all duration-300">
          <div className={`max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14 md:h-16' : 'h-16 md:h-20'}`}>
            {/* Brand — logo dot + sayt nomi */}
            <a href={`#${pages[0]?.slug ?? 'home'}`} className="flex items-center gap-2.5" onClick={(e) => { e.preventDefault(); setActiveSlug(pages[0]?.slug ?? 'home'); }}>
              <span style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, borderRadius: '8px' }}
                className="w-8 h-8 flex items-center justify-center font-black text-sm shadow-md"
                aria-hidden="true">
                <span style={{ color: colors.onPrimary }}>{(siteName[0] ?? 'N').toUpperCase()}</span>
              </span>
              <span style={{ color: colors.text }} className="font-black text-base md:text-lg tracking-tight ns-display">{siteName}</span>
            </a>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link, i) => (
                link.href ? (
                  <a key={i} href={link.href} onClick={link.onClick}
                    style={{ color: link.active ? colors.primary : colors.text, opacity: link.active ? 1 : 0.7 }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-100 transition-opacity capitalize">
                    {link.label}
                  </a>
                ) : (
                  <button key={i} type="button" onClick={link.onClick}
                    style={link.active
                      ? { background: colors.primary + '15', color: colors.primary }
                      : { color: colors.text, opacity: 0.7 }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-100 transition capitalize">
                    {link.label}
                  </button>
                )
              ))}
              {contactContent.phone && (
                <a href={`tel:${contactContent.phone}`}
                  style={{ background: colors.primary, color: colors.onPrimary, borderRadius: getRadius(design) }}
                  className="ns-btn-primary ml-3 px-4 py-2 text-xs font-bold">
                  📞 {contactContent.phone}
                </a>
              )}
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
            <Component content={content} colors={colors} design={design} />
          </div>
        );
      })}

      {/* ── Footer (multi-column) ─────────────────────────── */}
      <footer style={{ background: colors.isDarkBg ? '#0a0a0a' : colors.text, color: '#ffffff', fontFamily: colors.font }} className="px-4 md:px-8 pt-14 md:pt-20 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
            {/* Brand kolonkasi */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 mb-4">
                <span style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, borderRadius: '8px' }}
                  className="w-9 h-9 flex items-center justify-center font-black">
                  <span style={{ color: colors.onPrimary }}>{(siteName[0] ?? 'N').toUpperCase()}</span>
                </span>
                <span className="font-black text-lg ns-display">{siteName || 'Brand'}</span>
              </div>
              <p className="text-sm leading-relaxed max-w-md" style={{ opacity: 0.7 }}>
                {String(schema?.description ?? '') || `${siteName} — ishonchli xizmat va sifat kafolati bilan.`}
              </p>
              <div className="mt-5 flex gap-2">
                {['📘','📷','✈️','▶'].map((icon, i) => (
                  <a key={i} href="#" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px' }}
                    className="w-9 h-9 flex items-center justify-center text-sm hover:bg-white/15 transition">
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Sahifalar kolonkasi */}
            {pages.length > 1 && (
              <div className="md:col-span-3">
                <h4 className="ns-eyebrow mb-4" style={{ opacity: 0.6 }}>Sahifalar</h4>
                <ul className="space-y-2">
                  {pages.slice(0, 6).map((p, idx) => (
                    <li key={idx}>
                      <button onClick={() => setActiveSlug(p.slug ?? `p-${idx}`)}
                        className="text-sm font-medium hover:opacity-100 transition capitalize"
                        style={{ opacity: 0.7 }}>
                        {pageLabel(p, idx)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Kontakt kolonkasi */}
            <div className={pages.length > 1 ? 'md:col-span-4' : 'md:col-span-7'}>
              <h4 className="ns-eyebrow mb-4" style={{ opacity: 0.6 }}>Aloqa</h4>
              <ul className="space-y-2.5 text-sm" style={{ opacity: 0.85 }}>
                {contactContent.phone && (
                  <li><a href={`tel:${contactContent.phone}`} className="hover:opacity-70 transition">📞 {contactContent.phone}</a></li>
                )}
                {contactContent.email && (
                  <li><a href={`mailto:${contactContent.email}`} className="hover:opacity-70 transition break-all">✉️ {contactContent.email}</a></li>
                )}
                {contactContent.address && (
                  <li className="flex items-start gap-1.5">📍 <span>{contactContent.address}</span></li>
                )}
                {!contactContent.phone && !contactContent.email && !contactContent.address && (
                  <li className="italic opacity-60">Aloqa ma&apos;lumotlari tez orada qo&apos;shiladi</li>
                )}
              </ul>
            </div>
          </div>

          {/* Pastki qator */}
          <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', opacity: 0.6 }}>
            <span>© {new Date().getFullYear()} {siteName || 'Brand'}. Barcha huquqlar himoyalangan.</span>
            <span>Powered by <a href="https://nanostup.uz" target="_blank" rel="noreferrer" className="hover:opacity-80 underline">NanoStUp</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
});
