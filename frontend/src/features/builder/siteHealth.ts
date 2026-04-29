/**
 * Site Health Score — sayt sifatini 0-100 ball orqali baholaydi.
 * Schema'dan hisoblanadi: sahifalar soni, seksiyalar, contact bor/yo'q.
 * Maqsadi: foydalanuvchini saytni yaxshilashga undash (retention).
 */

export interface HealthCheck {
  key: string;
  label: string;
  passed: boolean;
  weight: number;        // 0-100, jami yig'indi 100
  recommendation?: string;
}

export interface HealthScore {
  total: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'emerald' | 'lime' | 'amber' | 'orange' | 'red';
  label: string;
  checks: HealthCheck[];
  recommendations: string[];
}

interface SchemaPage {
  slug?: string;
  sections?: Array<{ type?: string; content?: Record<string, unknown> }>;
}

interface SchemaShape {
  pages?: SchemaPage[];
  settings?: { primaryColor?: string; bgColor?: string; font?: string };
  siteName?: string;
}

export function calculateHealthScore(schema: SchemaShape | null | undefined): HealthScore {
  const pages = schema?.pages ?? [];
  const allSections = pages.flatMap((p) => p.sections ?? []);
  const sectionTypes = new Set(allSections.map((s) => (s.type ?? '').toLowerCase()));

  const checks: HealthCheck[] = [
    {
      key: 'pages_min',
      label: 'Kamida 3 ta sahifa',
      passed: pages.length >= 3,
      weight: 15,
      recommendation: 'Sayt 3+ sahifaga ega bo\'lsa professional ko\'rinadi (home, about, contact)',
    },
    {
      key: 'sections_min',
      label: 'Kamida 8 ta seksiya',
      passed: allSections.length >= 8,
      weight: 15,
      recommendation: 'Ko\'proq seksiyalar mijoz ishonchini oshiradi (features, testimonials, va h.k.)',
    },
    {
      key: 'contact',
      label: 'Aloqa seksiyasi mavjud',
      passed: sectionTypes.has('contact'),
      weight: 10,
      recommendation: 'Aloqa formasi mijozlar bilan bog\'lanish uchun zarur',
    },
    {
      key: 'cta',
      label: 'Call-to-action mavjud',
      passed: sectionTypes.has('cta') || sectionTypes.has('booking'),
      weight: 10,
      recommendation: 'CTA tugmalari konversiyani 30%+ oshiradi',
    },
    {
      key: 'about',
      label: 'About yoki team mavjud',
      passed: sectionTypes.has('about') || sectionTypes.has('team'),
      weight: 8,
      recommendation: 'Ishonchni mustahkamlash uchun "About" bo\'limi qo\'shing',
    },
    {
      key: 'social_proof',
      label: 'Mijoz fikrlari yoki stats',
      passed: sectionTypes.has('testimonials') || sectionTypes.has('stats') || sectionTypes.has('logos'),
      weight: 10,
      recommendation: 'Mijoz fikrlari (testimonials) yoki raqamlar (stats) qo\'shing',
    },
    {
      key: 'visual_content',
      label: 'Vizual kontent (galereya/portfolio)',
      passed: sectionTypes.has('gallery') || sectionTypes.has('portfolio') || sectionTypes.has('products') || sectionTypes.has('properties'),
      weight: 10,
      recommendation: 'Galereya yoki portfolio rasmlar bilan saytni jonlantiradi',
    },
    {
      key: 'design_set',
      label: 'Brend rangi sozlangan',
      passed: !!schema?.settings?.primaryColor && schema.settings.primaryColor.toLowerCase() !== '#000000' && schema.settings.primaryColor.toLowerCase() !== '#ffffff',
      weight: 12,
      recommendation: 'Brendingiz uchun maxsus rang tanlang',
    },
    {
      key: 'site_name',
      label: 'Sayt nomi mavjud',
      passed: !!(schema?.siteName?.trim()),
      weight: 5,
      recommendation: 'Saytga unique nom bering',
    },
    {
      key: 'rich_content',
      label: 'Boy seksiya kontenti',
      passed: allSections.some((s) => Object.keys(s.content ?? {}).length >= 5),
      weight: 5,
      recommendation: 'Seksiyalarga ko\'proq kontent qo\'shing (subtitle, description, items)',
    },
  ];

  const total = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const recommendations = checks.filter((c) => !c.passed && c.recommendation).map((c) => c.recommendation!);

  let grade: HealthScore['grade'];
  let color: HealthScore['color'];
  let label: string;

  if (total >= 90)      { grade = 'A'; color = 'emerald'; label = 'A\'lo'; }
  else if (total >= 75) { grade = 'B'; color = 'lime';    label = 'Yaxshi'; }
  else if (total >= 60) { grade = 'C'; color = 'amber';   label = 'O\'rtacha'; }
  else if (total >= 40) { grade = 'D'; color = 'orange';  label = 'Yaxshilash kerak'; }
  else                  { grade = 'F'; color = 'red';     label = 'Past'; }

  return { total, grade, color, label, checks, recommendations: recommendations.slice(0, 3) };
}

/**
 * Score uchun Tailwind klasslar — color enum'iga qarab.
 */
export const HEALTH_COLOR_CLASSES: Record<HealthScore['color'], { text: string; bg: string; border: string; ring: string }> = {
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'ring-emerald-500' },
  lime:    { text: 'text-lime-300',    bg: 'bg-lime-500/10',    border: 'border-lime-500/30',    ring: 'ring-lime-500' },
  amber:   { text: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   ring: 'ring-amber-500' },
  orange:  { text: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  ring: 'ring-orange-500' },
  red:     { text: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     ring: 'ring-red-500' },
};
