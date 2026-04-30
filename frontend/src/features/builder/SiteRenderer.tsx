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
  // ── Template registry meta (backend `template_registry.py` dan) ──
  // Saytlar bir xil ko'rinmasligi uchun har sayt yaratilganda backend
  // niche-ga mos template tanlaydi va bu fieldlarni schema.design ga yozadi.
  template_id?: string;
  design_seed?: string;
  layout_variant?: string;       // default | classic | modern | bold | elegant
  typography_variant?: string;   // sans | serif | display | mono
  density_variant?: string;      // compact | comfortable | spacious
  niche?: string;
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
  // Template registry density_variant ustuvor (backend deterministik
  // tanlagan), keyin schema.density, oxirida default.
  const key = d.density_variant ?? d.density ?? 'comfortable';
  return map[key] ?? 'py-16 md:py-24';
}

// Typography variant (template_registry) → CSS font-family stack.
// Template har xil typography_variant bersa, sayt boshqacha ko'rinadi.
function typographyFontStack(variant: string | undefined, fallback: string): string {
  switch (variant) {
    case 'serif':   return `"Playfair Display", "DM Serif Display", Georgia, serif`;
    case 'display': return `"Space Grotesk", "Cabinet Grotesk", "Manrope", system-ui, sans-serif`;
    case 'mono':    return `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace`;
    case 'sans':    return `"Inter", "Manrope", system-ui, -apple-system, sans-serif`;
    default:        return fallback;
  }
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
// Tartib muhim: aniqroq nichelar (news, pharmacy, wedding) — avval; umumiylar — oxirida.
const PALETTES = [
  // Specifik nichelar — avval
  { keys: ['yangilik','news','gazeta','akhbor','axborot','jurnal','jurnalistika','media','axborotnoma'], primary:'#dc2626', accent:'#1f2937', bg:'#fafafa', text:'#111827', font:'Playfair Display' },
  { keys: ['dorixona','pharmacy','dori','apteka','medikament'], primary:'#16a34a', accent:'#0ea5e9', bg:'#f0fdf4', text:'#052e16', font:'Inter' },
  { keys: ['to\'y','toy','wedding','nikoh','marriage','kelin','kuyov','to\'yxona'], primary:'#c8a880', accent:'#e8c5a0', bg:'#fff8f0', text:'#2a1810', font:'Playfair Display' },
  { keys: ['musiqa','music','konsert','concert','festival','dj','club','klub','event','tadbir'], primary:'#a855f7', accent:'#ec4899', bg:'#0a0a0a', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['fotograf','photography','suratchi','surat olish','video studio'], primary:'#0a0a0a', accent:'#fbbf24', bg:'#fafafa', text:'#0a0a0a', font:'Playfair Display' },
  { keys: ['bank','moliya','finance','kredit','sug\'urta','insurance','invest'], primary:'#1e3a8a', accent:'#fbbf24', bg:'#f8fafc', text:'#0f172a', font:'Inter' },
  { keys: ['xayriya','fond','charity','non-profit','foundation','volunteer','yordam'], primary:'#2d6a4f', accent:'#95d5b2', bg:'#f0fff4', text:'#1b4332', font:'Poppins' },
  // Mavjud nichelar
  { keys: ['restoran','cafe','kafe','food','taom','oshxona','pizza','burger','sushi','choyxona'], primary:'#e85d04', accent:'#f48c06', bg:'#fff8f0', text:'#1a0a00', font:'Poppins' },
  { keys: ['salon','spa','beauty','go\'zallik','gozallik','kosmetik','nail','barber','soch','manikur'], primary:'#c9184a', accent:'#ff4d6d', bg:'#fff0f3', text:'#1a0005', font:'Playfair Display' },
  { keys: ['gym','fitness','sport','trener','bodybuilding','crossfit','yoga','jismoniy'], primary:'#e63946', accent:'#f4a261', bg:'#0d0d0d', text:'#ffffff', font:'Montserrat' },
  { keys: ['klinika','clinic','tibbiy','doktor','shifokor','hospital','health','sog\'liq','stomatolog','shifoxona'], primary:'#0077b6', accent:'#00b4d8', bg:'#f0f8ff', text:'#023e8a', font:'Inter' },
  { keys: ['tech','saas','startup','software','dastur','ilova','digital','texnologiya','web studio'], primary:'#6366f1', accent:'#8b5cf6', bg:'#0f0f1a', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['real estate','uy sotish','kvartira','property','ko\'chmas','realtor','ijara'], primary:'#1d4e89', accent:'#f4a261', bg:'#f8f9fa', text:'#1a1a2e', font:'Raleway' },
  { keys: ['ta\'lim','talim','kurs','maktab','akademiya','school','academy','edu','o\'quv','trening'], primary:'#2d6a4f', accent:'#52b788', bg:'#f0fff4', text:'#081c15', font:'Poppins' },
  { keys: ['agentlik','agency','kreativ','creative','dizayn','design studio','marketing','reklama','smm','branding'], primary:'#7209b7', accent:'#f72585', bg:'#10002b', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['shop','do\'kon','dokon','market','mahsulot','store','ecommerce','savdo','sotish'], primary:'#e63946', accent:'#457b9d', bg:'#ffffff', text:'#1d3557', font:'Inter' },
  { keys: ['hotel','mehmonxona','turizm','travel','tourism','resort','sayohat','hostel','otel'], primary:'#b5838d', accent:'#e5989b', bg:'#fff4e6', text:'#2d1b1e', font:'Playfair Display' },
  { keys: ['avto','auto','mashina','transport','taxi','avtomobil','servis stansiya','ehtiyot qism'], primary:'#212529', accent:'#ffd60a', bg:'#0a0a0a', text:'#ffffff', font:'Montserrat' },
  { keys: ['portfolio','freelancer','shaxsiy','personal','resume'], primary:'#4361ee', accent:'#4cc9f0', bg:'#0d1b2a', text:'#ffffff', font:'Space Grotesk' },
  { keys: ['qurilish','construction','arxitektura','architect','building'], primary:'#3a405a', accent:'#f4a261', bg:'#f5f5f0', text:'#1a1a2a', font:'Raleway' },
  { keys: ['yuridik','lawyer','advokat','legal','huquq','sud','notarius'], primary:'#1b2a4a', accent:'#c9a84c', bg:'#f5f0e8', text:'#1b2a4a', font:'Playfair Display' },
];

function smartPalette(siteName: string, sections: string[]) {
  const hay = (siteName + ' ' + sections.join(' ')).toLowerCase();
  for (const p of PALETTES) {
    if (p.keys.some(k => hay.includes(k))) return p;
  }
  return { primary:'#2563eb', accent:'#7c3aed', bg:'#ffffff', text:'#111827', font:'Inter' };
}

// ── Niche category detector ────────────────────────────────────
// Site Renderer'ga vizual variantlar tanlash uchun.
// Returns: 'news' | 'wedding' | 'music' | 'photo' | 'restaurant' | 'tech'
// | 'realestate' | 'fitness' | 'medical' | 'beauty' | 'auto' | 'shop'
// | 'agency' | 'finance' | 'legal' | 'hotel' | 'education' | 'default'
export type NicheCategory =
  | 'news' | 'wedding' | 'music' | 'photo' | 'restaurant'
  | 'tech' | 'realestate' | 'fitness' | 'medical' | 'beauty'
  | 'auto' | 'shop' | 'agency' | 'finance' | 'legal'
  | 'hotel' | 'education' | 'default';

const NICHE_KEYWORDS: Record<Exclude<NicheCategory, 'default'>, string[]> = {
  news:        ['yangilik','news','gazeta','akhbor','axborot','jurnal','jurnalistika','media','axborotnoma'],
  wedding:     ['to\'y','toy','wedding','nikoh','marriage','kelin','kuyov','to\'yxona'],
  music:       ['musiqa','music','konsert','concert','festival','dj','club','klub','event','tadbir'],
  photo:       ['fotograf','photography','suratchi','surat olish','video studio','foto'],
  restaurant:  ['restoran','cafe','kafe','food','taom','oshxona','pizza','burger','sushi','choyxona'],
  tech:        ['tech','saas','startup','software','dastur','ilova','digital','texnologiya','web studio'],
  realestate:  ['real estate','uy sotish','kvartira','property','ko\'chmas','realtor','ijara'],
  fitness:     ['gym','fitness','sport','trener','bodybuilding','crossfit','yoga','jismoniy'],
  medical:     ['klinika','clinic','tibbiy','doktor','shifokor','hospital','health','sog\'liq','stomatolog','shifoxona','dorixona','pharmacy','dori','apteka'],
  beauty:      ['salon','spa','beauty','go\'zallik','gozallik','kosmetik','nail','barber','soch','manikur'],
  auto:        ['avto','auto','mashina','transport','taxi','avtomobil','servis stansiya','ehtiyot qism'],
  shop:        ['shop','do\'kon','dokon','market','mahsulot','store','ecommerce','savdo','sotish'],
  agency:      ['agentlik','agency','kreativ','creative','dizayn','design studio','marketing','reklama','smm','branding'],
  finance:     ['bank','moliya','finance','kredit','sug\'urta','insurance','invest'],
  legal:       ['yuridik','lawyer','advokat','legal','huquq','sud','notarius'],
  hotel:       ['hotel','mehmonxona','turizm','travel','tourism','resort','sayohat','hostel','otel'],
  education:   ['ta\'lim','talim','kurs','maktab','akademiya','school','academy','edu','o\'quv','trening'],
};

export function detectNiche(siteName?: string, sectionTypes: string[] = []): NicheCategory {
  const hay = ((siteName ?? '') + ' ' + sectionTypes.join(' ')).toLowerCase();
  for (const [niche, keys] of Object.entries(NICHE_KEYWORDS)) {
    if (keys.some(k => hay.includes(k))) return niche as NicheCategory;
  }
  return 'default';
}

// Niche → preferred Hero variant
function nicheHeroVariant(niche: NicheCategory): 'centered' | 'split' | 'fullscreen' | null {
  const map: Partial<Record<NicheCategory, 'centered' | 'split' | 'fullscreen'>> = {
    news: 'split',         // Magazine-style: title left, ribbon visual right
    wedding: 'centered',   // Romantic centered with ornaments
    music: 'fullscreen',   // Dark dramatic
    photo: 'fullscreen',   // Bold minimalist
    restaurant: 'split',   // Photo + text
    tech: 'fullscreen',    // Bold modern
    realestate: 'split',   // Property visual
    fitness: 'fullscreen', // Energetic dark
    medical: 'split',      // Trust + clean
    beauty: 'split',       // Visual luxury
    auto: 'fullscreen',    // Bold dark
    shop: 'split',         // Product showcase
    agency: 'fullscreen',  // Bold creative
    finance: 'split',      // Trust + clean
    legal: 'split',        // Authority
    hotel: 'fullscreen',   // Premium image
    education: 'centered', // Welcoming
  };
  return map[niche] ?? null;
}

// ── Niche-aware section variant selectors ──────────────────────
// Har niche uchun maxsus layout variantini qaytaradi. Agar niche='default'
// bo'lsa — design.style yoki design.layout_variant (template registry'dan)
// asosida fallback variant tanlanadi. Bu — bir xil niche bo'lsa ham
// saytlar bir-biriga o'xshamasligini ta'minlaydi.
type StatsV = 'grid' | 'split' | 'highlight';
type AboutV = 'split' | 'centered' | 'image-overlay';
type TestiV = 'grid' | 'featured' | 'masonry';
type CtaV   = 'banner' | 'split' | 'gradient';
type ContactV = 'split' | 'sidebar' | 'centered';
type TeamV  = 'cards' | 'minimal' | 'big-photo';
type FaqV   = 'stacked' | 'two-column';

// Template layout_variant → section variant mapping.
// Backend template_registry.py'dagi 4 ta variant uchun har sayt
// section variantini turlicha qaytaramiz. Shunda har template noyob
// vizual identifikatorga ega bo'ladi.
function layoutVariantOverride(
  layoutVariant: string | undefined,
  kind: 'stats' | 'about' | 'testi' | 'cta' | 'team',
): StatsV | AboutV | TestiV | CtaV | TeamV | null {
  if (!layoutVariant) return null;
  const overrides: Record<string, Record<string, string>> = {
    classic:  { stats: 'split',     about: 'split',         testi: 'grid',     cta: 'banner',   team: 'cards'     },
    modern:   { stats: 'highlight', about: 'split',         testi: 'grid',     cta: 'gradient', team: 'cards'     },
    bold:     { stats: 'highlight', about: 'image-overlay', testi: 'masonry',  cta: 'gradient', team: 'big-photo' },
    elegant:  { stats: 'split',     about: 'centered',      testi: 'featured', cta: 'split',    team: 'big-photo' },
    default:  { stats: 'grid',      about: 'split',         testi: 'grid',     cta: 'banner',   team: 'cards'     },
  };
  const m = overrides[layoutVariant];
  if (!m) return null;
  return (m[kind] as StatsV | AboutV | TestiV | CtaV | TeamV) ?? null;
}

function nicheStatsVariant(niche: NicheCategory, design: SiteDesign): StatsV {
  // Template registry layout_variant override (birinchi navbatda)
  const ov = layoutVariantOverride(design.layout_variant, 'stats') as StatsV | null;
  if (ov) return ov;
  const map: Partial<Record<NicheCategory, StatsV>> = {
    news: 'split', restaurant: 'highlight', wedding: 'grid', music: 'highlight',
    fitness: 'highlight', medical: 'split', tech: 'split', agency: 'highlight',
    realestate: 'grid', shop: 'grid', auto: 'highlight', hotel: 'highlight',
    education: 'split', finance: 'grid', legal: 'split', photo: 'highlight',
    beauty: 'grid',
  };
  if (map[niche]) return map[niche]!;
  if (['minimal','editorial','corporate'].includes(design.style ?? '')) return 'split';
  if (['bold-gradient','dark','luxury'].includes(design.style ?? '')) return 'highlight';
  return 'grid';
}

function nicheAboutVariant(niche: NicheCategory, design: SiteDesign): AboutV {
  const ov = layoutVariantOverride(design.layout_variant, 'about') as AboutV | null;
  if (ov) return ov;
  const map: Partial<Record<NicheCategory, AboutV>> = {
    wedding: 'centered', music: 'image-overlay', photo: 'image-overlay',
    restaurant: 'split', fitness: 'image-overlay', medical: 'split',
    tech: 'split', agency: 'image-overlay', realestate: 'split',
    shop: 'split', auto: 'image-overlay', hotel: 'image-overlay',
    education: 'centered', finance: 'split', legal: 'centered',
    news: 'split', beauty: 'centered',
  };
  if (map[niche]) return map[niche]!;
  if (['minimal','editorial','corporate'].includes(design.style ?? '')) return 'centered';
  if (['bold-gradient','dark','luxury','glassmorphism'].includes(design.style ?? '')) return 'image-overlay';
  return 'split';
}

function nicheTestiVariant(niche: NicheCategory, design: SiteDesign): TestiV {
  const ov = layoutVariantOverride(design.layout_variant, 'testi') as TestiV | null;
  if (ov) return ov;
  const map: Partial<Record<NicheCategory, TestiV>> = {
    wedding: 'featured', restaurant: 'masonry', music: 'featured',
    photo: 'featured', fitness: 'featured', medical: 'grid',
    tech: 'grid', agency: 'masonry', realestate: 'grid',
    shop: 'grid', auto: 'featured', hotel: 'featured',
    education: 'masonry', finance: 'grid', legal: 'featured',
    news: 'masonry', beauty: 'featured',
  };
  if (map[niche]) return map[niche]!;
  if (['minimal','corporate'].includes(design.style ?? '')) return 'grid';
  if (['luxury','editorial','glassmorphism'].includes(design.style ?? '')) return 'featured';
  return 'grid';
}

function nicheCtaVariant(niche: NicheCategory, design: SiteDesign): CtaV {
  const ov = layoutVariantOverride(design.layout_variant, 'cta') as CtaV | null;
  if (ov) return ov;
  const map: Partial<Record<NicheCategory, CtaV>> = {
    wedding: 'split', restaurant: 'split', music: 'gradient',
    photo: 'banner', fitness: 'gradient', medical: 'banner',
    tech: 'gradient', agency: 'gradient', realestate: 'split',
    shop: 'banner', auto: 'gradient', hotel: 'split',
    education: 'banner', finance: 'banner', legal: 'banner',
    news: 'banner', beauty: 'split',
  };
  if (map[niche]) return map[niche]!;
  if (['bold-gradient','playful','dark','glassmorphism'].includes(design.style ?? '')) return 'gradient';
  if (['luxury','editorial'].includes(design.style ?? '')) return 'split';
  return 'banner';
}

function nicheContactVariant(niche: NicheCategory, _design: SiteDesign): ContactV {
  void _design;
  const map: Partial<Record<NicheCategory, ContactV>> = {
    wedding: 'centered', restaurant: 'sidebar', music: 'centered',
    photo: 'centered', fitness: 'sidebar', medical: 'sidebar',
    tech: 'split', agency: 'split', realestate: 'sidebar',
    shop: 'split', auto: 'sidebar', hotel: 'sidebar',
    education: 'split', finance: 'split', legal: 'sidebar',
    news: 'split', beauty: 'sidebar',
  };
  return map[niche] ?? 'split';
}

function nicheTeamVariant(niche: NicheCategory, design: SiteDesign): TeamV {
  const ov = layoutVariantOverride(design.layout_variant, 'team') as TeamV | null;
  if (ov) return ov;
  const map: Partial<Record<NicheCategory, TeamV>> = {
    wedding: 'big-photo', restaurant: 'cards', music: 'big-photo',
    photo: 'big-photo', fitness: 'big-photo', medical: 'cards',
    tech: 'minimal', agency: 'big-photo', realestate: 'cards',
    shop: 'cards', auto: 'cards', hotel: 'big-photo',
    education: 'cards', finance: 'minimal', legal: 'cards',
    news: 'minimal', beauty: 'big-photo',
  };
  if (map[niche]) return map[niche]!;
  if (['minimal','corporate','editorial'].includes(design.style ?? '')) return 'minimal';
  return 'cards';
}

function nicheFaqVariant(niche: NicheCategory, _design: SiteDesign): FaqV {
  void _design;
  // 2-column for content-heavy niches, stacked for editorial/intimate ones
  const twoCol: NicheCategory[] = ['tech','agency','shop','realestate','auto','medical','finance','education'];
  return twoCol.includes(niche) ? 'two-column' : 'stacked';
}

// Niche → trust stats badges (Hero ostida ko'rsatiladi)
// Har niche uchun 3 ta mini metrika qaytariladi.
type TrustStat = { v: string; l: string };
function nicheTrustStats(niche: NicheCategory): TrustStat[] | null {
  const m: Partial<Record<NicheCategory, TrustStat[]>> = {
    restaurant:  [{v:'10+', l:"yil tajriba"}, {v:'500+', l:'mijoz har kuni'}, {v:'4.9★', l:'reyting'}],
    medical:     [{v:'24/7', l:'tez yordam'}, {v:'15+', l:'shifokor'}, {v:'10K+', l:'bemor'}],
    realestate:  [{v:'150+', l:'obyekt'}, {v:'10+', l:'yil bozorda'}, {v:'4.9★', l:'mijozlar'}],
    fitness:     [{v:'25+', l:'trener'}, {v:'1000+', l:'a\'zolar'}, {v:'24/7', l:'ochiq'}],
    beauty:      [{v:'12+', l:'usta'}, {v:'5K+', l:'mijoz'}, {v:'4.9★', l:'reyting'}],
    tech:        [{v:'500+', l:'mijoz'}, {v:'99.9%', l:'uptime'}, {v:'4.9★', l:'NPS'}],
    agency:      [{v:'120+', l:'loyiha'}, {v:'8 yil', l:'tajriba'}, {v:'40+', l:'brend'}],
    shop:        [{v:'10K+', l:'mahsulot'}, {v:'24h', l:'yetkazib berish'}, {v:'4.8★', l:'reyting'}],
    education:   [{v:'2K+', l:"o'quvchi"}, {v:'30+', l:"o'qituvchi"}, {v:'95%', l:'natija'}],
    hotel:       [{v:'5★', l:'darajali'}, {v:'120+', l:'xona'}, {v:'24/7', l:'qabul'}],
    auto:        [{v:'15+', l:'yil'}, {v:'5K+', l:'avtomobil'}, {v:'24/7', l:'servis'}],
    finance:     [{v:'10+', l:"yil bozorda"}, {v:'50K+', l:'mijoz'}, {v:'A+', l:'reyting'}],
    legal:       [{v:'15+', l:'yil tajriba'}, {v:'95%', l:"yutilgan ish"}, {v:'500+', l:'mijoz'}],
    photo:       [{v:'500+', l:'sessiya'}, {v:'8 yil', l:'tajriba'}, {v:'4.9★', l:'reyting'}],
    music:       [{v:'200+', l:'tadbir'}, {v:'10K+', l:'tomoshabin'}, {v:'5★', l:'baho'}],
    wedding:     [{v:'500+', l:"to'y"}, {v:'10 yil', l:'tajriba'}, {v:'5★', l:'baho'}],
    news:        [{v:'1M+', l:'oquvchi'}, {v:'24/7', l:'yangiliklar'}, {v:'10+', l:'yil'}],
  };
  return m[niche] ?? null;
}

function isPlain(color?: string) {
  if (!color) return true;
  const c = color.toLowerCase().replace('#','');
  return ['000000','111111','0d0d0d','1a1a1a','ffffff','fefefe','f8f8f8','f5f5f5','eeeeee','e5e5e5'].includes(c);
}

// ── Design token helper ─────────────────────────────────────────
function useColors(settings?: SiteSettings, siteName?: string, sectionTypes?: string[], design?: SiteDesign) {
  const palette = (isPlain(settings?.primaryColor) || !settings?.primaryColor)
    ? smartPalette(siteName ?? '', sectionTypes ?? [])
    : null;

  const primary = (!isPlain(settings?.primaryColor) && settings?.primaryColor) ? settings.primaryColor : palette!.primary;
  const accent  = (!isPlain(settings?.accentColor)  && settings?.accentColor)  ? settings.accentColor  : (palette?.accent  ?? '#6366f1');
  const bg      = settings?.bgColor   ?? palette?.bg   ?? '#ffffff';
  const text    = settings?.textColor ?? palette?.text  ?? '#111827';
  const baseFont = settings?.font     ?? palette?.font  ?? 'Inter';
  // Template typography_variant ustun bo'ladi (backend deterministik
  // tanlagan stack). Aks holda, palette/settings'dan kelgan font ishlatiladi.
  const font   = typographyFontStack(design?.typography_variant, baseFont);
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
type SectionProps = { content: SectionContent; colors: Colors; design: SiteDesign; niche?: NicheCategory };

// ── Niche-specific decorative elements for Hero ─────────────────
// Har niche uchun: floating cards, ribbons, ornaments, badges
function NicheHeroDecor({ niche, colors }: { niche: NicheCategory; colors: Colors }) {
  if (niche === 'news') {
    // Breaking news ribbon (top-right)
    return (
      <div className="absolute top-6 right-6 z-20 pointer-events-none ns-fade-up ns-d-1">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest"
          style={{ background: colors.primary, color: colors.onPrimary, boxShadow: '0 6px 20px -4px rgba(0,0,0,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colors.onPrimary }} />
          Live
        </div>
      </div>
    );
  }
  if (niche === 'wedding') {
    // Romantic ornament — flower divider
    return (
      <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 z-0 pointer-events-none flex justify-center opacity-20">
        <div className="w-full max-w-md flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: colors.primary }} />
          <span className="text-2xl" style={{ color: colors.primary }}>❦</span>
          <div className="flex-1 h-px" style={{ background: colors.primary }} />
        </div>
      </div>
    );
  }
  if (niche === 'music') {
    // Lightning streaks
    return (
      <>
        <div className="absolute top-8 left-10 z-0 pointer-events-none opacity-40 ns-fade-up text-4xl">⚡</div>
        <div className="absolute bottom-12 right-12 z-0 pointer-events-none opacity-30 ns-fade-up ns-d-2 text-4xl">🎵</div>
      </>
    );
  }
  if (niche === 'photo') {
    // Aperture ring
    return (
      <div className="absolute top-8 right-8 z-10 pointer-events-none ns-fade-up ns-d-1">
        <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
          style={{ borderColor: colors.accent, background: 'transparent' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: colors.accent }} />
        </div>
      </div>
    );
  }
  if (niche === 'restaurant') {
    // Floating opening hours card
    return (
      <div className="absolute bottom-8 right-8 z-10 pointer-events-none ns-fade-up ns-d-3 hidden lg:block">
        <div className="px-4 py-3 rounded-xl shadow-2xl"
          style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}` }}>
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.mutedText }}>
            Bugun ochiq
          </div>
          <div className="text-sm font-black mt-0.5" style={{ color: colors.primary }}>
            10:00 — 23:00
          </div>
        </div>
      </div>
    );
  }
  if (niche === 'tech' || niche === 'agency') {
    // Floating "trusted by" mini stat card
    return (
      <div className="absolute bottom-8 left-8 z-10 pointer-events-none ns-fade-up ns-d-3 hidden md:block">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="flex -space-x-1.5">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2"
                style={{ background: colors.accent, borderColor: colors.bg }} />
            ))}
          </div>
          <span className="text-[11px] font-bold" style={{ color: colors.onPrimary }}>+500 mijoz</span>
        </div>
      </div>
    );
  }
  if (niche === 'fitness') {
    // Energetic flame badge
    return (
      <div className="absolute top-1/3 right-8 z-10 pointer-events-none ns-fade-up ns-d-1 hidden md:block">
        <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span className="text-base">🔥</span>
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.onPrimary }}>
            +250 trener
          </span>
        </div>
      </div>
    );
  }
  if (niche === 'medical') {
    // Trust badge (24/7)
    return (
      <div className="absolute bottom-8 right-8 z-10 pointer-events-none ns-fade-up ns-d-3 hidden md:block">
        <div className="px-4 py-2 rounded-xl shadow-lg"
          style={{ background: colors.bg, border: `2px solid ${colors.primary}33` }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏥</span>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.mutedText }}>24/7</div>
              <div className="text-xs font-black" style={{ color: colors.primary }}>Tez yordam</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (niche === 'realestate') {
    // Floating property stat
    return (
      <div className="absolute bottom-8 right-8 z-10 pointer-events-none ns-fade-up ns-d-3 hidden md:block">
        <div className="grid grid-cols-3 gap-3 px-4 py-3 rounded-xl shadow-2xl"
          style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}` }}>
          <div className="text-center"><div className="text-base font-black" style={{ color: colors.primary }}>150+</div><div className="text-[9px]" style={{ color: colors.mutedText }}>Obyekt</div></div>
          <div className="text-center"><div className="text-base font-black" style={{ color: colors.primary }}>10+</div><div className="text-[9px]" style={{ color: colors.mutedText }}>Yil</div></div>
          <div className="text-center"><div className="text-base font-black" style={{ color: colors.primary }}>★★★★★</div><div className="text-[9px]" style={{ color: colors.mutedText }}>Reyting</div></div>
        </div>
      </div>
    );
  }
  if (niche === 'finance' || niche === 'legal') {
    // Trust seal
    return (
      <div className="absolute top-8 right-8 z-10 pointer-events-none ns-fade-up ns-d-1 hidden md:block">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
          <span className="text-lg">{niche === 'legal' ? '⚖️' : '🏦'}</span>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.mutedText }}>Litsenziyalangan</div>
            <div className="text-xs font-black" style={{ color: colors.text }}>O&apos;zbekiston</div>
          </div>
        </div>
      </div>
    );
  }
  if (niche === 'hotel') {
    // Star rating badge
    return (
      <div className="absolute top-8 right-8 z-10 pointer-events-none ns-fade-up ns-d-1">
        <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
          <span className="text-sm">★★★★★</span>
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.onPrimary }}>5 yulduz</span>
        </div>
      </div>
    );
  }
  return null;
}

// ── Section: Hero (3 variants: centered | split | fullscreen) ────────
function Hero({ content, colors, design, niche = 'default' }: SectionProps) {
  const title    = String(content.title    ?? content.heading  ?? 'Xush kelibsiz');
  const subtitle = String(content.subtitle ?? '');
  const desc     = String(content.description ?? '');
  const cta      = String(content.ctaText  ?? content.cta ?? content.button ?? '');
  const cta2     = String(content.cta2Text ?? content.secondaryCta ?? '');
  const badge    = content.badge ? String(content.badge) : '';
  // Niche bo'yicha smart variant tanlash (agar design ma'lum bo'lmasa)
  const nicheV   = nicheHeroVariant(niche);
  const v        = nicheV ?? heroVariant(design);
  const r        = getRadius(design);
  const py       = getDensityPy(design);

  // Trust stats — content.stats ustun, fallback niche-default
  type HeroStat = { v?: string; value?: string | number; l?: string; label?: string };
  const rawStats = (content.stats as HeroStat[]) ?? (content.trustStats as HeroStat[]);
  const inlineStats: TrustStat[] = Array.isArray(rawStats)
    ? rawStats.map(s => ({ v: String(s.v ?? s.value ?? ''), l: String(s.l ?? s.label ?? '') })).filter(s => s.v)
    : [];
  const trust: TrustStat[] = inlineStats.length >= 2 ? inlineStats : (nicheTrustStats(niche) ?? []);

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

  // Trust stats row — JSX expression, light va dark variant
  const renderTrustRow = (onDark: boolean, centered: boolean) => trust.length === 0 ? null : (
    <div className={`ns-fade-up ns-d-5 pt-8 grid grid-cols-3 gap-4 max-w-2xl ${centered ? 'mt-14 mx-auto sm:gap-10' : 'mt-12 sm:gap-8'}`}
      style={{ borderTop: onDark ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${colors.cardBorder}` }}>
      {trust.slice(0, 3).map((s, i) => (
        <div key={i} className={centered ? 'text-center' : 'text-left'}>
          <div className="text-2xl sm:text-3xl md:text-4xl font-black ns-display"
            style={{ color: onDark ? colors.onPrimary : colors.primary }}>{s.v}</div>
          <div className="mt-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider"
            style={{ color: onDark ? `${colors.onPrimary}99` : colors.mutedText }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
  const trustRowSplit       = renderTrustRow(false, false);
  const trustRowFullscreen  = renderTrustRow(true, true);
  const trustRowCentered    = renderTrustRow(false, true);

  // Glow accent (har Hero pastida — ramka kabi)
  const GlowAccent = (
    <div aria-hidden className="absolute -bottom-px left-0 right-0 h-px pointer-events-none"
      style={{ background: `linear-gradient(90deg, transparent, ${colors.primary}, ${colors.accent}, transparent)`, opacity: 0.6 }} />
  );

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
        <NicheHeroDecor niche={niche} colors={colors} />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative">
          <div className="ns-fade-up">
            {Badge}
            <h1 style={{ color: colors.text }} className="ns-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black">{title}</h1>
            {subtitle && <p style={{ color: colors.primary }} className="mt-4 text-lg sm:text-xl font-semibold">{subtitle}</p>}
            {desc && <p style={{ color: colors.mutedText }} className="mt-5 text-base sm:text-lg leading-relaxed max-w-xl">{desc}</p>}
            {RichCtas}
            {trustRowSplit}
          </div>
          {VisualBlock}
        </div>
        {GlowAccent}
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
        <NicheHeroDecor niche={niche} colors={colors} />
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
          {trustRowFullscreen}
        </div>
        {GlowAccent}
      </section>
    );
  }

  // Centered variant
  return (
    <section style={{ background: colors.bg, color: colors.text, fontFamily: colors.font }}
      className={`${py} px-4 md:px-8 text-center relative overflow-hidden`}>
      {MeshBg}
      <NicheHeroDecor niche={niche} colors={colors} />
      <div className="relative z-10 max-w-5xl mx-auto">
        {Badge}
        <h1 style={{ color: colors.text }}
          className="ns-display ns-fade-up text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black max-w-4xl mx-auto">
          {title}
        </h1>
        {subtitle && <p style={{ color: colors.primary }} className="ns-fade-up ns-d-1 mt-5 text-lg sm:text-xl font-semibold max-w-2xl mx-auto">{subtitle}</p>}
        {desc && <p style={{ color: colors.mutedText }} className="ns-fade-up ns-d-2 mt-5 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">{desc}</p>}
        <div className="ns-fade-up ns-d-3 flex flex-col sm:flex-row gap-3 justify-center items-center">{RichCtas}</div>
        {trustRowCentered}
      </div>
      {GlowAccent}
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

// ── Section: Stats (3 variants: grid | split | highlight) ───────
interface StatItem { value?: string | number; number?: string | number; label?: string; title?: string; icon?: string; description?: string; }

function Stats({ content, colors, design, niche = 'default' }: SectionProps) {
  const items: StatItem[] = (content.items as StatItem[]) ?? (content.stats as StatItem[]) ?? [];
  const title = content.title ? String(content.title) : '';
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const v = nicheStatsVariant(niche, design);
  const r = getRadius(design);
  const py = getDensityPy(design);
  if (items.length === 0) return null;

  // SPLIT — chap tomonda title+desc, o'ngda 2x2 stat grid
  if (v === 'split') {
    return (
      <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
          <div className="md:col-span-5">
            <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle || 'Raqamlar tilida'}</div>
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title || "Bizning natijalarimiz"}</h2>
            <p style={{ color: colors.mutedText }} className="mt-4 text-sm sm:text-base leading-relaxed max-w-md">
              {String(content.description ?? '') || "Yillar davomida to'plagan tajribamiz va mijozlarimizning ishonchi — bizning eng katta yutug'imiz."}
            </p>
          </div>
          <div className="md:col-span-7 grid grid-cols-2 gap-4 md:gap-5">
            {items.slice(0, 4).map((item, i) => (
              <div key={i}
                style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
                className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-6 md:p-8 relative overflow-hidden`}>
                <div aria-hidden className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 blur-2xl"
                  style={{ background: i % 2 === 0 ? colors.primary : colors.accent }} />
                {item.icon && <div className="text-2xl mb-3 relative">{item.icon}</div>}
                <div style={{ color: colors.primary }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display relative">
                  {item.value ?? item.number ?? ''}
                </div>
                <div style={{ color: colors.text }} className="mt-1.5 text-sm font-bold relative">{item.label ?? item.title ?? ''}</div>
                {item.description && <p style={{ color: colors.mutedText }} className="mt-1.5 text-xs leading-relaxed relative">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // HIGHLIGHT — dark gradient banner, katta raqamlar, accent stripe
  if (v === 'highlight') {
    return (
      <section style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
        fontFamily: colors.font,
      }} className={`${py} px-4 md:px-8 relative overflow-hidden`}>
        <div className="absolute inset-0 ns-grain opacity-30" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl" style={{ background: colors.onPrimary, opacity: 0.08 }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl" style={{ background: colors.onPrimary, opacity: 0.08 }} />
        <div className="max-w-6xl mx-auto relative">
          {(title || subtitle) && (
            <div className="text-center mb-12">
              {subtitle && <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="ns-eyebrow mb-3">{subtitle}</div>}
              {title && <h2 style={{ color: colors.onPrimary }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>}
            </div>
          )}
          <div className={`grid gap-8 md:gap-4 ${items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : items.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
            {items.map((item, i) => (
              <div key={i} className={`text-center relative ns-fade-up ns-d-${Math.min(i + 1, 6)} ${i > 0 ? 'md:border-l md:border-white/15' : ''} px-2`}>
                {item.icon && <div className="text-3xl mb-2">{item.icon}</div>}
                <div style={{ color: colors.onPrimary }} className="text-5xl sm:text-6xl md:text-7xl font-black ns-display tracking-tight">
                  {item.value ?? item.number ?? ''}
                </div>
                <div style={{ color: colors.onPrimary, opacity: 0.85 }} className="mt-2 text-xs sm:text-sm font-bold uppercase tracking-widest">
                  {item.label ?? item.title ?? ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // GRID — ko'p mahsulot/obyekt nicheslari uchun: katta cardlar
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
            {title && <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>}
          </div>
        )}
        <div className={`grid gap-4 md:gap-5 ${items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : items.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          {items.map((item, i) => (
            <div key={i}
              style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
              className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-6 md:p-8 text-center relative overflow-hidden`}>
              {item.icon && (
                <div style={{ background: `${colors.primary}15`, color: colors.primary, borderRadius: r }}
                  className="w-12 h-12 mx-auto flex items-center justify-center text-xl mb-3">
                  {item.icon}
                </div>
              )}
              <div style={{ color: colors.primary }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">
                {item.value ?? item.number ?? ''}
              </div>
              <div style={{ color: colors.text }} className="mt-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest">
                {item.label ?? item.title ?? ''}
              </div>
            </div>
          ))}
        </div>
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

// ── Section: Contact (3 variants: split | sidebar | centered) ────
function Contact({ content, colors, design, niche = 'default' }: SectionProps) {
  const r = getRadius(design);
  const py = getDensityPy(design);
  const title    = String(content.title ?? "Bog'lanish");
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const email    = content.email   ? String(content.email)   : '';
  const phone    = content.phone   ? String(content.phone)   : '';
  const address  = content.address ? String(content.address) : '';
  const hours    = content.workingHours ? String(content.workingHours) : '';
  const v = nicheContactVariant(niche, design);
  const inputStyle = { background: colors.bg, border: `1px solid ${colors.cardBorder}`, color: colors.text, borderRadius: r };

  const renderInfoRow = (icon: string, label: string, value: string, href?: string) => (
    <div className="flex items-start gap-3">
      <span style={{ background: `${colors.primary}15`, color: colors.primary, borderRadius: r }}
        className="w-10 h-10 shrink-0 flex items-center justify-center text-base">{icon}</span>
      <div className="min-w-0 flex-1">
        <div style={{ color: colors.mutedText }} className="text-[11px] font-bold uppercase tracking-wider mb-0.5">{label}</div>
        {href ? (
          <a href={href} style={{ color: colors.text }} className="text-sm font-semibold break-all hover:opacity-70 transition">{value}</a>
        ) : (
          <p style={{ color: colors.text }} className="text-sm font-medium leading-snug">{value}</p>
        )}
      </div>
    </div>
  );

  const FormFields = (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert("Xabaringiz qabul qilindi."); }}>
      <input placeholder="Ismingiz" style={inputStyle} className="w-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-offset-0" required />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="email" placeholder="Email" style={inputStyle} className="w-full px-4 py-3 text-sm outline-none" />
        <input type="tel" placeholder="Telefon" style={inputStyle} className="w-full px-4 py-3 text-sm outline-none" />
      </div>
      <textarea rows={4} placeholder="Xabar..." style={inputStyle} className="w-full px-4 py-3 text-sm outline-none resize-none" />
      <button type="submit" style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r, boxShadow: `0 8px 22px -6px ${colors.primary}55` }}
        className="ns-btn-primary w-full py-3.5 font-black text-sm">Yuborish <span className="ns-arrow">→</span></button>
    </form>
  );

  // CENTERED — minimal, intim (wedding/photo/music)
  if (v === 'centered') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8 relative overflow-hidden`}>
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${colors.primary}10, transparent 60%)` }} />
        <div className="max-w-2xl mx-auto relative">
          <div className="text-center mb-10">
            {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
            <div className="mt-5 mx-auto w-12 h-px" style={{ background: colors.primary }} />
          </div>
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="p-6 md:p-10 ns-fade-up">
            {(email || phone || address || hours) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-6 mb-6" style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                {phone && renderInfoRow('📞', 'Telefon', phone, `tel:${phone}`)}
                {email && renderInfoRow('✉️', 'Email', email, `mailto:${email}`)}
                {address && renderInfoRow('📍', 'Manzil', address)}
                {hours && renderInfoRow('🕐', 'Ish vaqti', hours)}
              </div>
            )}
            {FormFields}
          </div>
        </div>
      </section>
    );
  }

  // SIDEBAR — chap tomondagi colored sidebar info, o'ngda form (medical/restaurant/auto)
  if (v === 'sidebar') {
    return (
      <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
          </div>
          <div style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r, boxShadow: '0 24px 50px -16px rgba(0,0,0,0.12)' }}
            className="grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            {/* Colored sidebar */}
            <aside style={{ background: `linear-gradient(160deg, ${colors.primary}, ${colors.accent})` }}
              className="md:col-span-5 p-7 md:p-10 relative overflow-hidden">
              <div aria-hidden className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-20" style={{ background: colors.onPrimary }} />
              <h3 style={{ color: colors.onPrimary }} className="text-xl md:text-2xl font-black ns-display">Aloqa ma&apos;lumotlari</h3>
              <p style={{ color: colors.onPrimary, opacity: 0.85 }} className="mt-2 text-sm leading-relaxed">Savollaringiz bormi? Biz har doim sizga yordam berishga tayyormiz.</p>
              <div className="mt-7 space-y-4 relative">
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-start gap-3 group">
                    <span style={{ background: 'rgba(255,255,255,0.18)' }} className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0">📞</span>
                    <div>
                      <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="text-[11px] font-bold uppercase tracking-wider">Telefon</div>
                      <div style={{ color: colors.onPrimary }} className="text-sm font-bold group-hover:underline">{phone}</div>
                    </div>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-start gap-3 group">
                    <span style={{ background: 'rgba(255,255,255,0.18)' }} className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0">✉️</span>
                    <div className="min-w-0">
                      <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="text-[11px] font-bold uppercase tracking-wider">Email</div>
                      <div style={{ color: colors.onPrimary }} className="text-sm font-bold break-all group-hover:underline">{email}</div>
                    </div>
                  </a>
                )}
                {address && (
                  <div className="flex items-start gap-3">
                    <span style={{ background: 'rgba(255,255,255,0.18)' }} className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0">📍</span>
                    <div>
                      <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="text-[11px] font-bold uppercase tracking-wider">Manzil</div>
                      <div style={{ color: colors.onPrimary }} className="text-sm font-bold leading-snug">{address}</div>
                    </div>
                  </div>
                )}
                {hours && (
                  <div className="flex items-start gap-3">
                    <span style={{ background: 'rgba(255,255,255,0.18)' }} className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0">🕐</span>
                    <div>
                      <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="text-[11px] font-bold uppercase tracking-wider">Ish vaqti</div>
                      <div style={{ color: colors.onPrimary }} className="text-sm font-bold">{hours}</div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
            <div className="md:col-span-7 p-7 md:p-10">
              <h3 style={{ color: colors.text }} className="text-xl md:text-2xl font-black ns-display mb-5">Xabar yuborish</h3>
              {FormFields}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // SPLIT — default 50/50 info+form (tech/agency/legal/finance)
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
          <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="p-6 md:p-8 space-y-5">
            {phone && renderInfoRow('📞', 'Telefon', phone, `tel:${phone}`)}
            {email && renderInfoRow('✉️', 'Email', email, `mailto:${email}`)}
            {address && renderInfoRow('📍', 'Manzil', address)}
            {hours && renderInfoRow('🕐', 'Ish vaqti', hours)}
            {!phone && !email && !address && !hours && (
              <p style={{ color: colors.mutedText }} className="text-sm italic">Aloqa ma&apos;lumotlari tez orada qo&apos;shiladi.</p>
            )}
          </div>
          <div style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className="p-6 md:p-8">
            {FormFields}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section: About (3 variants: split | centered | image-overlay) ─
function About({ content, colors, design, niche = 'default' }: SectionProps) {
  const r = getRadius(design);
  const py = getDensityPy(design);
  const title    = String(content.title ?? content.heading ?? 'Biz haqimizda');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const desc     = String(content.description ?? content.text ?? '');
  const mission  = content.mission ? String(content.mission) : '';
  const values: Array<{ title?: string; text?: string; icon?: string }> = (content.values as Array<{ title?: string; text?: string; icon?: string }>) ?? [];
  const v = nicheAboutVariant(niche, design);

  // CENTERED — minimal, intim, wedding/legal/education uchun
  if (v === 'centered') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8 relative overflow-hidden`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl" style={{ background: colors.primary }} aria-hidden />
        <div className="max-w-3xl mx-auto text-center relative">
          {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3 ns-fade-up">{subtitle}</div>}
          <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display ns-fade-up ns-d-1">{title}</h2>
          <div className="mt-6 mx-auto w-16 h-px" style={{ background: colors.primary }} />
          {desc && <p style={{ color: colors.mutedText }} className="mt-8 text-base sm:text-lg leading-relaxed ns-fade-up ns-d-2">{desc}</p>}
          {mission && (
            <blockquote style={{ borderLeft: `3px solid ${colors.primary}`, color: colors.text }}
              className="mt-8 px-6 py-3 text-left text-base italic leading-relaxed max-w-xl mx-auto ns-fade-up ns-d-3">
              {mission}
            </blockquote>
          )}
          {values.length > 0 && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {values.slice(0, 3).map((val, i) => (
                <div key={i} className={`text-center ns-fade-up ns-d-${Math.min(i + 4, 6)}`}>
                  <div style={{ background: `${colors.primary}15`, color: colors.primary, borderRadius: '9999px' }}
                    className="w-12 h-12 mx-auto flex items-center justify-center text-lg mb-3">
                    {val.icon ?? '✦'}
                  </div>
                  <h4 style={{ color: colors.text }} className="font-bold text-sm">{val.title ?? ''}</h4>
                  <p style={{ color: colors.mutedText }} className="mt-1.5 text-xs leading-relaxed">{val.text ?? ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // IMAGE-OVERLAY — dramatik dark gradient, photo/music/agency uchun
  if (v === 'image-overlay') {
    const imgSrc = (content.image ?? content.photo ?? '') as string;
    return (
      <section style={{ fontFamily: colors.font }} className={`${py} px-4 md:px-8 relative overflow-hidden`}>
        {/* Background gradient/image */}
        <div className="absolute inset-0" style={{
          background: imgSrc
            ? `linear-gradient(135deg, ${colors.primary}ee 0%, ${colors.accent}cc 100%)`
            : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
        }} />
        {imgSrc && <img src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" aria-hidden />}
        <div className="absolute inset-0 ns-grain opacity-30" />
        <div className="relative max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7 ns-fade-up">
            {subtitle && <div style={{ color: colors.onPrimary, opacity: 0.7 }} className="ns-eyebrow mb-4">{subtitle}</div>}
            <h2 style={{ color: colors.onPrimary }} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black ns-display">{title}</h2>
            {desc && <p style={{ color: colors.onPrimary, opacity: 0.85 }} className="mt-5 text-base sm:text-lg leading-relaxed max-w-xl">{desc}</p>}
            {mission && <p style={{ color: colors.onPrimary, opacity: 0.7 }} className="mt-3 text-sm leading-relaxed max-w-xl italic">&ldquo;{mission}&rdquo;</p>}
          </div>
          {values.length > 0 && (
            <div className="md:col-span-5 space-y-3">
              {values.slice(0, 3).map((val, i) => (
                <div key={i}
                  style={{ background: 'rgba(255,255,255,0.1)', borderLeft: `3px solid ${colors.onPrimary}`, borderRadius: r, backdropFilter: 'blur(10px)' }}
                  className={`ns-fade-up ns-d-${Math.min(i + 2, 6)} p-4 md:p-5`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{val.icon ?? '✦'}</span>
                    <div>
                      <h4 style={{ color: colors.onPrimary }} className="font-bold text-sm md:text-base">{val.title ?? ''}</h4>
                      <p style={{ color: colors.onPrimary, opacity: 0.8 }} className="mt-1 text-xs sm:text-sm leading-relaxed">{val.text ?? ''}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // SPLIT — text+visual side-by-side (default)
  const imgSrc = (content.image ?? content.photo ?? '') as string;
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="ns-fade-up">
          {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
          <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
          {desc && <p style={{ color: colors.mutedText }} className="mt-5 text-sm sm:text-base leading-relaxed">{desc}</p>}
          {mission && (
            <p style={{ color: colors.text, borderLeft: `3px solid ${colors.primary}` }}
              className="mt-5 pl-4 text-sm leading-relaxed italic">{mission}</p>
          )}
          {values.length > 0 && (
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {values.slice(0, 4).map((val, i) => (
                <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
                  className={`p-4 ns-fade-up ns-d-${Math.min(i + 2, 6)}`}>
                  <div className="flex items-start gap-2.5">
                    <span style={{ background: `${colors.primary}15`, color: colors.primary, borderRadius: r }}
                      className="w-8 h-8 flex items-center justify-center text-sm font-black shrink-0">
                      {val.icon ?? String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4 style={{ color: colors.text }} className="font-bold text-sm">{val.title ?? ''}</h4>
                      <p style={{ color: colors.mutedText }} className="mt-0.5 text-xs leading-relaxed">{val.text ?? ''}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Visual side — image yoki abstract block */}
        <div className="relative aspect-[4/5] w-full ns-fade-up ns-d-2">
          {imgSrc ? (
            <>
              <img src={imgSrc} alt="" style={{ borderRadius: r }} className="absolute inset-0 w-full h-full object-cover shadow-2xl" />
              <div aria-hidden style={{ background: colors.accent, borderRadius: r }}
                className="absolute -top-4 -right-4 w-24 h-24 -z-0" />
            </>
          ) : (
            <>
              <div aria-hidden style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, borderRadius: r }} className="absolute inset-0" />
              <div style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r, boxShadow: '0 20px 50px -10px rgba(0,0,0,0.18)' }}
                className="absolute bottom-6 left-6 right-12 p-5">
                <div style={{ color: colors.primary }} className="text-3xl font-black ns-display">{values[0]?.title ?? "Bizning qadriyatlarimiz"}</div>
                <p style={{ color: colors.text }} className="mt-2 text-sm leading-snug">{values[0]?.text ?? "Sifat, professionallik va mijozga e'tibor — bizning asosiy tamoyillarimiz."}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Section: Testimonials (3 variants: grid | featured | masonry) ─
interface TestimonialItem { name?: string; role?: string; company?: string; text?: string; rating?: number; avatar?: string; image?: string; }

function Testimonials({ content, colors, design, niche = 'default' }: SectionProps) {
  const r = getRadius(design);
  const py = getDensityPy(design);
  const title = String(content.title ?? 'Mijozlar fikri');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: TestimonialItem[] = (content.items as TestimonialItem[]) ?? [];
  const v = nicheTestiVariant(niche, design);
  if (items.length === 0) return null;

  const renderAvatar = (item: TestimonialItem, big?: boolean) => {
    const src = item.avatar || item.image;
    const sz = big ? 'w-14 h-14' : 'w-10 h-10';
    if (src) return <img src={src} alt={item.name ?? ''} className={`${sz} rounded-full object-cover shrink-0`} />;
    return (
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.onPrimary }}
        className={`${sz} rounded-full flex items-center justify-center font-black text-sm shrink-0`}>
        {(item.name ?? '?')[0].toUpperCase()}
      </div>
    );
  };

  // FEATURED — bitta katta sitata, pastida 3 ta kichik
  if (v === 'featured' && items.length >= 1) {
    const first = items[0];
    const rest = items.slice(1, 4);
    return (
      <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8 relative overflow-hidden`}>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.06] blur-3xl" style={{ background: colors.primary }} aria-hidden />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-12">
            <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle || 'Mijozlar fikri'}</div>
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
          </div>
          {/* Featured big quote */}
          <div style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r, boxShadow: '0 30px 60px -20px rgba(0,0,0,0.15)' }}
            className="ns-fade-up p-8 md:p-12 relative">
            <div style={{ color: colors.primary, opacity: 0.18 }} className="absolute top-4 left-6 md:top-6 md:left-8 text-7xl md:text-8xl font-serif leading-none select-none">“</div>
            {first.rating && <div className="text-amber-400 text-base mb-4 relative">{'★'.repeat(Math.min(5, first.rating))}</div>}
            <p style={{ color: colors.text }} className="relative text-lg md:text-2xl font-semibold leading-relaxed">{first.text ?? ''}</p>
            <div className="mt-8 pt-6 flex items-center gap-4" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
              {renderAvatar(first, true)}
              <div>
                <div style={{ color: colors.text }} className="font-black text-base">{first.name ?? ''}</div>
                <div style={{ color: colors.mutedText }} className="text-xs sm:text-sm">{[first.role, first.company].filter(Boolean).join(', ')}</div>
              </div>
            </div>
          </div>
          {rest.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rest.map((item, i) => (
                <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
                  className={`ns-card ns-fade-up ns-d-${Math.min(i + 2, 6)} p-5`}>
                  {item.rating && <div className="text-amber-400 text-xs mb-2">{'★'.repeat(Math.min(5, item.rating))}</div>}
                  <p style={{ color: colors.text }} className="text-sm leading-relaxed line-clamp-4">{item.text ?? ''}</p>
                  <div className="mt-4 flex items-center gap-2.5">
                    {renderAvatar(item)}
                    <div>
                      <div style={{ color: colors.text }} className="font-bold text-xs">{item.name ?? ''}</div>
                      <div style={{ color: colors.mutedText }} className="text-[11px]">{[item.role, item.company].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // MASONRY — turli o'lchamdagi bricklar (CSS columns)
  if (v === 'masonry') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle || 'Mijozlar fikri'}</div>
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6 [column-fill:_balance]">
            {items.map((item, i) => (
              <div key={i} style={{ background: i % 3 === 0 ? colors.primary : colors.cardBg, border: `1px solid ${i % 3 === 0 ? colors.primary : colors.cardBorder}`, borderRadius: r }}
                className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} mb-5 md:mb-6 p-6 break-inside-avoid relative`}>
                {item.rating && <div className="text-amber-400 text-sm mb-3">{'★'.repeat(Math.min(5, item.rating))}</div>}
                <p style={{ color: i % 3 === 0 ? colors.onPrimary : colors.text }}
                  className="text-sm md:text-[15px] leading-relaxed">{item.text ?? ''}</p>
                <div className="mt-5 pt-5 flex items-center gap-3"
                  style={{ borderTop: `1px solid ${i % 3 === 0 ? `${colors.onPrimary}33` : colors.cardBorder}` }}>
                  {renderAvatar(item)}
                  <div>
                    <div style={{ color: i % 3 === 0 ? colors.onPrimary : colors.text }} className="font-bold text-sm">{item.name ?? ''}</div>
                    <div style={{ color: i % 3 === 0 ? `${colors.onPrimary}99` : colors.mutedText }} className="text-xs">{[item.role, item.company].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // GRID — default uniform 3-column
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
          <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }} className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-6 md:p-7 flex flex-col relative`}>
              <div style={{ color: colors.primary, opacity: 0.15 }} className="absolute top-4 right-5 text-5xl font-serif leading-none select-none">“</div>
              {item.rating && <div className="text-amber-400 text-sm mb-3">{'★'.repeat(Math.min(5, item.rating))}</div>}
              <p style={{ color: colors.text }} className="text-sm md:text-[15px] leading-relaxed flex-1 relative">{item.text ?? ''}</p>
              <div className="mt-5 pt-5 flex items-center gap-3" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
                {renderAvatar(item)}
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

// ── Section: Team (3 variants: cards | minimal | big-photo) ─────
interface TeamItem { name?: string; role?: string; bio?: string; photo?: string; image?: string; avatar?: string; }

function Team({ content, colors, design, niche = 'default' }: SectionProps) {
  const r = getRadius(design);
  const py = getDensityPy(design);
  const title = String(content.title ?? 'Jamoa');
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: TeamItem[] = (content.items as TeamItem[]) ?? [];
  const v = nicheTeamVariant(niche, design);
  if (items.length === 0) return null;

  const renderPhoto = (item: TeamItem, size: 'sm' | 'md' | 'lg') => {
    const src = item.photo || item.image || item.avatar;
    const cls = size === 'lg' ? 'aspect-[3/4] w-full'
              : size === 'md' ? 'w-24 h-24 sm:w-28 sm:h-28'
              : 'w-16 h-16 sm:w-20 sm:h-20';
    if (src) return <img src={src} alt={item.name ?? ''} style={{ borderRadius: size === 'lg' ? r : '9999px' }} className={`${cls} object-cover ${size === 'lg' ? '' : 'mx-auto'}`} />;
    return (
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.onPrimary, borderRadius: size === 'lg' ? r : '9999px' }}
        className={`${cls} flex items-center justify-center font-black ${size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-2xl' : 'text-xl'} ${size === 'lg' ? '' : 'mx-auto'}`}>
        {(item.name ?? '?')[0].toUpperCase()}
      </div>
    );
  };

  // BIG-PHOTO — katta vertikal kartalar (wedding/photo/agency/hotel/beauty)
  if (v === 'big-photo') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
          </div>
          <div className={`grid gap-5 md:gap-6 ${items.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {items.map((item, i) => (
              <div key={i} className={`ns-fade-up ns-d-${Math.min(i + 1, 6)} group`}>
                <div className="relative overflow-hidden" style={{ borderRadius: r }}>
                  {renderPhoto(item, 'lg')}
                  <div aria-hidden className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ background: `linear-gradient(to top, ${colors.primary}cc, transparent 60%)` }} />
                  {item.bio && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 transition-transform translate-y-full group-hover:translate-y-0">
                      <p style={{ color: colors.onPrimary }} className="text-xs leading-relaxed">{item.bio}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div style={{ color: colors.text }} className="font-black text-base ns-display">{item.name ?? ''}</div>
                  <div style={{ color: colors.primary }} className="text-xs font-bold uppercase tracking-wider mt-0.5">{item.role ?? ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // MINIMAL — tor list (corporate/tech/legal/finance/news)
  if (v === 'minimal') {
    return (
      <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
                className={`ns-fade-up ns-d-${Math.min(i + 1, 6)} flex items-center gap-4 p-4 md:p-5 hover:shadow-lg transition-shadow`}>
                {renderPhoto(item, 'sm')}
                <div className="flex-1 min-w-0">
                  <div style={{ color: colors.text }} className="font-bold text-sm md:text-base">{item.name ?? ''}</div>
                  <div style={{ color: colors.primary }} className="text-xs font-semibold mt-0.5">{item.role ?? ''}</div>
                  {item.bio && <p style={{ color: colors.mutedText }} className="mt-1 text-xs leading-relaxed line-clamp-2">{item.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // CARDS — default uniform card grid
  return (
    <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
          <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
        </div>
        <div className={`grid gap-4 md:gap-6 ${items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
          {items.map((item, i) => (
            <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: r }}
              className={`ns-card ns-fade-up ns-d-${Math.min(i + 1, 6)} p-5 md:p-6 text-center`}>
              {renderPhoto(item, 'md')}
              <div style={{ color: colors.text }} className="mt-4 font-black text-sm md:text-base ns-display">{item.name ?? ''}</div>
              <div style={{ color: colors.primary }} className="text-xs font-bold uppercase tracking-wider mt-0.5">{item.role ?? ''}</div>
              {item.bio && <p style={{ color: colors.mutedText }} className="mt-2 text-xs leading-relaxed">{item.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: FAQ (2 variants: stacked | two-column) ─────────────
interface FaqItem { question?: string; answer?: string; }

function Faq({ content, colors, design, niche = 'default' }: SectionProps) {
  const r = getRadius(design);
  const py = getDensityPy(design);
  const title = String(content.title ?? "Ko'p so'raladigan savollar");
  const subtitle = content.subtitle ? String(content.subtitle) : '';
  const items: FaqItem[] = (content.items as FaqItem[]) ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const v = nicheFaqVariant(niche, design);
  if (items.length === 0) return null;

  const renderFaqItem = (item: FaqItem, i: number) => (
    <div key={i} style={{ background: colors.cardBg, border: `1px solid ${open === i ? colors.primary + '55' : colors.cardBorder}`, borderRadius: r }}
      className={`ns-fade-up ns-d-${Math.min(i + 1, 6)} overflow-hidden transition-colors`}>
      <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 md:p-6 text-left gap-4">
        <span style={{ color: colors.text }} className="font-semibold text-sm md:text-base">{item.question ?? ''}</span>
        <span style={{ background: open === i ? colors.primary : `${colors.primary}18`, color: open === i ? colors.onPrimary : colors.primary, borderRadius: '9999px' }}
          className="w-7 h-7 flex items-center justify-center text-base shrink-0 transition">{open === i ? '−' : '+'}</span>
      </button>
      {open === i && <div style={{ color: colors.mutedText }} className="px-5 md:px-6 pb-5 md:pb-6 text-sm md:text-[15px] leading-relaxed">{item.answer ?? ''}</div>}
    </div>
  );

  // TWO-COLUMN — chap title+subtitle+CTA, o'ngda accordion (tech/agency/shop/realestate)
  if (v === 'two-column') {
    return (
      <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14">
          <div className="md:col-span-4">
            <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle || 'FAQ'}</div>
            <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
            <p style={{ color: colors.mutedText }} className="mt-5 text-sm leading-relaxed">
              Boshqa savollaringiz bormi? Mutaxassislarimiz bilan bevosita aloqaga chiqing.
            </p>
            <a href="#contact" style={{ background: colors.primary, color: colors.onPrimary, borderRadius: r }}
              className="ns-btn-primary mt-6 inline-flex px-6 py-3 font-bold text-sm">
              Bog&apos;lanish <span className="ns-arrow">→</span>
            </a>
          </div>
          <div className="md:col-span-8 space-y-3">
            {items.map((item, i) => renderFaqItem(item, i))}
          </div>
        </div>
      </section>
    );
  }

  // STACKED — default centered accordion (wedding/restaurant/legal/photo/...)
  return (
    <section style={{ background: colors.sectionAlt, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          {subtitle && <div style={{ color: colors.primary }} className="ns-eyebrow mb-3">{subtitle}</div>}
          <h2 style={{ color: colors.text }} className="text-3xl sm:text-4xl md:text-5xl font-black ns-display">{title}</h2>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => renderFaqItem(item, i))}
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

// ── Section: CTA (3 variants: banner | split | gradient) ────────
function Cta({ content, colors, design, niche = 'default' }: SectionProps) {
  const r = getRadius(design);
  const py = getDensityPy(design);
  const title = String(content.title ?? 'Boshlash vaqti keldi');
  const desc  = content.description ? String(content.description) : '';
  const cta   = String(content.ctaText ?? content.cta ?? "Bepul sinab ko'rish");
  const cta2  = content.cta2Text ? String(content.cta2Text) : (content.secondaryCta ? String(content.secondaryCta) : '');
  const badge = content.badge ? String(content.badge) : '';
  const ctaLink = String(content.ctaLink ?? '#contact');
  const v = nicheCtaVariant(niche, design);

  // GRADIENT — vibrant gradient mesh, music/tech/agency uchun
  if (v === 'gradient') {
    return (
      <section style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
        fontFamily: colors.font,
      }} className={`${py} px-4 md:px-8 text-center relative overflow-hidden`}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 25% 30%, ${colors.onPrimary}30, transparent 50%), radial-gradient(circle at 75% 70%, ${colors.accent}88, transparent 50%)` }} />
        <div className="absolute inset-0 ns-grain opacity-30" />
        <div aria-hidden className="absolute top-10 left-10 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: colors.onPrimary }} />
        <div aria-hidden className="absolute bottom-10 right-10 w-40 h-40 rounded-full blur-3xl opacity-25" style={{ background: colors.onPrimary }} />
        <div className="relative max-w-3xl mx-auto">
          {badge && (
            <span style={{ background: 'rgba(255,255,255,0.18)', color: colors.onPrimary, border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
              className="ns-fade-up inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span style={{ background: colors.onPrimary }} className="w-1.5 h-1.5 rounded-full animate-pulse" />
              {badge}
            </span>
          )}
          <h2 style={{ color: colors.onPrimary }} className="ns-display ns-fade-up ns-d-1 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black">{title}</h2>
          {desc && <p style={{ color: colors.onPrimary, opacity: 0.85 }} className="ns-fade-up ns-d-2 mt-5 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">{desc}</p>}
          <div className="ns-fade-up ns-d-3 mt-9 flex flex-wrap gap-3 justify-center">
            <a href={ctaLink}
              style={{ background: colors.onPrimary, color: colors.primary, borderRadius: r, boxShadow: '0 14px 36px -10px rgba(0,0,0,0.4)' }}
              className="ns-btn-primary px-9 py-4 font-black text-sm">{cta} <span className="ns-arrow">→</span></a>
            {cta2 && (
              <a href="#"
                style={{ border: `1.5px solid ${colors.onPrimary}66`, color: colors.onPrimary, borderRadius: r, backdropFilter: 'blur(8px)' }}
                className="ns-btn-ghost px-9 py-4 font-bold text-sm bg-transparent">{cta2}</a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // SPLIT — chap text, o'ngda visual/form, intim/luxury uchun
  if (v === 'split') {
    return (
      <section style={{ background: colors.bg, fontFamily: colors.font }} className={`${py} px-4 md:px-8`}>
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, borderRadius: r }}
          className="max-w-6xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 ns-grain opacity-20" />
          <div aria-hidden className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: colors.onPrimary }} />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 p-8 md:p-14 items-center">
            <div className="ns-fade-up">
              {badge && (
                <span style={{ background: 'rgba(255,255,255,0.2)', color: colors.onPrimary, border: '1px solid rgba(255,255,255,0.3)' }}
                  className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{badge}</span>
              )}
              <h2 style={{ color: colors.onPrimary }} className="ns-display text-3xl sm:text-4xl md:text-5xl font-black">{title}</h2>
              {desc && <p style={{ color: colors.onPrimary, opacity: 0.85 }} className="mt-4 text-sm sm:text-base leading-relaxed">{desc}</p>}
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={ctaLink}
                  style={{ background: colors.onPrimary, color: colors.primary, borderRadius: r, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.35)' }}
                  className="ns-btn-primary px-7 py-3.5 font-black text-sm">{cta} <span className="ns-arrow">→</span></a>
                {cta2 && (
                  <a href="#"
                    style={{ border: `1.5px solid ${colors.onPrimary}66`, color: colors.onPrimary, borderRadius: r }}
                    className="ns-btn-ghost px-7 py-3.5 font-bold text-sm bg-transparent">{cta2}</a>
                )}
              </div>
            </div>
            {/* Visual block — floating card stack */}
            <div className="relative aspect-[4/3] hidden md:block ns-fade-up ns-d-2">
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: r, backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.25)' }}
                className="absolute inset-4 p-6 flex flex-col justify-center">
                <div className="text-5xl mb-3">{niche === 'wedding' ? '💍' : niche === 'restaurant' ? '🍽️' : niche === 'beauty' ? '💆' : niche === 'realestate' ? '🏠' : niche === 'hotel' ? '🏨' : '✨'}</div>
                <div style={{ color: colors.onPrimary }} className="text-xl font-black ns-display">{(content.featureTitle as string) ?? "Premium tajriba"}</div>
                <p style={{ color: colors.onPrimary, opacity: 0.8 }} className="mt-2 text-sm leading-relaxed">{(content.featureText as string) ?? "Sifat va professionallik birinchi o'rinda."}</p>
              </div>
              <div aria-hidden style={{ background: colors.onPrimary, opacity: 0.18, borderRadius: r }}
                className="absolute -top-2 -right-2 w-16 h-16" />
              <div aria-hidden style={{ background: colors.onPrimary, opacity: 0.1, borderRadius: '9999px' }}
                className="absolute -bottom-4 -left-4 w-24 h-24" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // BANNER — default solid primary, classic
  return (
    <section style={{ background: colors.primary, fontFamily: colors.font }} className={`${py} px-4 md:px-8 text-center relative overflow-hidden`}>
      <div className="absolute inset-0 ns-grain opacity-20" />
      <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-15" style={{ background: colors.accent }} />
      <div className="relative max-w-3xl mx-auto">
        {badge && <span style={{ background: colors.onPrimary + '25', color: colors.onPrimary }} className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{badge}</span>}
        <h2 style={{ color: colors.onPrimary }} className="ns-display text-3xl sm:text-4xl md:text-5xl font-black max-w-2xl mx-auto">{title}</h2>
        {desc && <p style={{ color: colors.onPrimary, opacity: 0.8 }} className="mt-4 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">{desc}</p>}
        <div className="mt-9 flex flex-wrap gap-3 justify-center">
          <a href={ctaLink}
            style={{ background: colors.onPrimary, color: colors.primary, borderRadius: r, boxShadow: '0 14px 36px -10px rgba(0,0,0,0.35)' }}
            className="ns-btn-primary px-8 py-4 font-black text-sm">{cta} <span className="ns-arrow">→</span></a>
          {cta2 && (
            <a href="#"
              style={{ border: `1.5px solid ${colors.onPrimary}66`, color: colors.onPrimary, borderRadius: r }}
              className="ns-btn-ghost px-8 py-4 font-bold text-sm bg-transparent">{cta2}</a>
          )}
        </div>
      </div>
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
  const design = schema ? resolveDesign(schema) : {} as SiteDesign;
  const colors = useColors(
    schema?.settings as SiteSettings | undefined,
    siteName,
    allSectionTypes,
    design,
  );
  const scrolled = useScrolled(40);
  // Niche detector: sayt nomi va seksiya turlari bo'yicha biznes turini aniqlaydi.
  // Hero komponentiga uzatiladi — har niche uchun maxsus dekorativ elementlar.
  const niche = detectNiche(siteName, allSectionTypes);

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
            <Component content={content} colors={colors} design={design} niche={niche} />
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
