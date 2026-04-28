'use client';

import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus2,
  GripVertical,
  Image as ImageIcon,
  Palette,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

// ── Types ──────────────────────────────────────────────────────

export type AnyObj = Record<string, unknown>;

interface Section {
  id?: string;
  type: string;
  content?: AnyObj;
  [key: string]: unknown;
}

interface Page {
  slug?: string;
  title?: string;
  sections?: Section[];
  [key: string]: unknown;
}

interface Settings {
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  font?: string;
  [key: string]: unknown;
}

export interface SchemaShape {
  siteName?: string;
  description?: string;
  language?: string;
  settings?: Settings;
  pages?: Page[];
  [key: string]: unknown;
}

// ── Helpers (immutable updates) ────────────────────────────────

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// ── Item field configs by section type ─────────────────────────

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'url' | 'image';
  placeholder?: string;
}

const ITEM_FIELDS: Record<string, FieldConfig[]> = {
  hero: [],
  features: [
    { key: 'title', label: 'Nomi', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'icon', label: 'Emoji ikon', type: 'text', placeholder: '🚀' },
    { key: 'price', label: 'Narx (ixt.)', type: 'text' },
  ],
  services: [
    { key: 'title', label: 'Xizmat nomi', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'icon', label: 'Emoji', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
  ],
  menu: [
    { key: 'name', label: 'Taom nomi', type: 'text' },
    { key: 'description', label: 'Tavsif (ingredientlar)', type: 'textarea' },
    { key: 'price', label: 'Narx', type: 'text', placeholder: "45 000 so'm" },
    { key: 'category', label: 'Kategoriya', type: 'text' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
  ],
  pricing: [
    { key: 'name', label: 'Tarif nomi', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
    { key: 'period', label: 'Davr (oy/yil)', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
  ],
  testimonials: [
    { key: 'name', label: 'Mijoz ismi', type: 'text' },
    { key: 'role', label: 'Lavozim/Kompaniya', type: 'text' },
    { key: 'text', label: 'Fikr matni', type: 'textarea' },
    { key: 'rating', label: 'Reyting (1-5)', type: 'number' },
    { key: 'image', label: 'Avatar URL', type: 'image' },
  ],
  team: [
    { key: 'name', label: 'Ism', type: 'text' },
    { key: 'role', label: 'Lavozim', type: 'text' },
    { key: 'bio', label: 'Bio', type: 'textarea' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
  ],
  faq: [
    { key: 'question', label: 'Savol', type: 'text' },
    { key: 'answer', label: 'Javob', type: 'textarea' },
  ],
  stats: [
    { key: 'value', label: 'Qiymat', type: 'text', placeholder: '500+' },
    { key: 'label', label: 'Belgi', type: 'text' },
    { key: 'icon', label: 'Emoji', type: 'text' },
  ],
  gallery: [
    { key: 'url', label: 'Rasm URL', type: 'image' },
    { key: 'caption', label: 'Izoh', type: 'text' },
  ],
};

const TOP_FIELDS: Record<string, FieldConfig[]> = {
  hero: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'badge', label: 'Yozuv (badge)', type: 'text' },
    { key: 'ctaText', label: 'Tugma matni', type: 'text' },
    { key: 'ctaLink', label: 'Tugma havolasi', type: 'text', placeholder: '#contact' },
  ],
  cta: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'ctaText', label: 'Tugma matni', type: 'text' },
    { key: 'ctaLink', label: 'Tugma havolasi', type: 'text' },
  ],
  about: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
    { key: 'description', label: 'Asosiy matn', type: 'textarea' },
    { key: 'mission', label: 'Missiya', type: 'textarea' },
  ],
  contact: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'address', label: 'Manzil', type: 'text' },
    { key: 'workingHours', label: 'Ish vaqti', type: 'text' },
  ],
  features: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  services: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  menu: [
    { key: 'title', label: 'Sarlavha', type: 'text', placeholder: 'Bizning Menyu' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  pricing: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  testimonials: [
    { key: 'title', label: 'Sarlavha', type: 'text', placeholder: "Mijozlar fikri" },
  ],
  team: [{ key: 'title', label: 'Sarlavha', type: 'text', placeholder: 'Bizning jamoa' }],
  faq: [{ key: 'title', label: 'Sarlavha', type: 'text', placeholder: 'Savol-javoblar' }],
  gallery: [{ key: 'title', label: 'Sarlavha', type: 'text', placeholder: 'Galereya' }],
  stats: [],
};

// ── Section templates (Yangi section qo'shish menyusi uchun) ───

interface SectionTemplate {
  type: string;
  label: string;
  emoji: string;
  defaultContent: AnyObj;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    type: 'hero',
    label: 'Hero (bosh banner)',
    emoji: '🎯',
    defaultContent: {
      title: 'Yangi sarlavha',
      subtitle: 'Qisqa subtitr',
      description: 'Bu yerda saytingiz haqida 1-2 jumla yozing.',
      ctaText: "Boshlash",
      ctaLink: '#contact',
    },
  },
  {
    type: 'about',
    label: 'About (biz haqimizda)',
    emoji: '📖',
    defaultContent: {
      title: 'Biz haqimizda',
      description: 'Kompaniyamiz tarixi va missiyasi haqida.',
      mission: 'Bizning maqsadimiz...',
      values: [],
    },
  },
  {
    type: 'features',
    label: 'Features (afzalliklar)',
    emoji: '⭐',
    defaultContent: {
      title: 'Afzalliklarimiz',
      subtitle: 'Nega aynan biz?',
      items: [
        { title: 'Tez', description: 'Tez xizmat', icon: '⚡' },
        { title: 'Sifatli', description: 'Yuqori sifat', icon: '✨' },
        { title: 'Arzon', description: 'Hamyonbop narx', icon: '💰' },
      ],
    },
  },
  {
    type: 'services',
    label: 'Services (xizmatlar)',
    emoji: '🛠️',
    defaultContent: {
      title: 'Xizmatlarimiz',
      items: [
        { title: 'Xizmat 1', description: 'Tavsif', price: '100 000' },
        { title: 'Xizmat 2', description: 'Tavsif', price: '200 000' },
      ],
    },
  },
  {
    type: 'menu',
    label: 'Menu (taom menyusi)',
    emoji: '🍽️',
    defaultContent: {
      title: 'Bizning Menyu',
      items: [
        { name: 'Plov', description: 'Toshkent oshi', price: "45 000 so'm", category: 'Asosiy' },
        { name: "Lag'mon", description: 'Issiq taom', price: "35 000 so'm", category: 'Asosiy' },
      ],
    },
  },
  {
    type: 'pricing',
    label: 'Pricing (narxlar)',
    emoji: '💎',
    defaultContent: {
      title: 'Tariflar',
      items: [
        { name: 'Boshlang\'ich', price: '$9', period: 'oy', description: 'Yangi boshlovchilarga' },
        { name: 'Pro', price: '$29', period: 'oy', description: 'Eng mashhur', popular: true },
        { name: 'Biznes', price: '$99', period: 'oy', description: 'Kompaniyalar uchun' },
      ],
    },
  },
  {
    type: 'stats',
    label: 'Stats (raqamlar)',
    emoji: '📊',
    defaultContent: {
      items: [
        { value: '500+', label: 'Mijozlar' },
        { value: '10+', label: 'Yillar' },
        { value: '99%', label: 'Mamnunlik' },
        { value: '24/7', label: 'Qo\'llab-quvvatlash' },
      ],
    },
  },
  {
    type: 'testimonials',
    label: 'Testimonials (sharhlar)',
    emoji: '💬',
    defaultContent: {
      title: 'Mijozlar fikri',
      items: [
        { name: 'Ali', role: 'Mijoz', text: 'Ajoyib xizmat!', rating: 5 },
      ],
    },
  },
  {
    type: 'team',
    label: 'Team (jamoa)',
    emoji: '👥',
    defaultContent: {
      title: 'Bizning jamoa',
      items: [
        { name: 'Ali Valiyev', role: 'Direktor', bio: 'Tajribali rahbar' },
      ],
    },
  },
  {
    type: 'faq',
    label: 'FAQ (savol-javob)',
    emoji: '❓',
    defaultContent: {
      title: 'Tez-tez beriladigan savollar',
      items: [
        { question: 'Qanday buyurtma berish mumkin?', answer: 'Bizga qo\'ng\'iroq qiling.' },
      ],
    },
  },
  {
    type: 'gallery',
    label: 'Gallery (galereya)',
    emoji: '🖼️',
    defaultContent: {
      title: 'Galereya',
      items: [],
    },
  },
  {
    type: 'cta',
    label: 'CTA (chaqiriq)',
    emoji: '📣',
    defaultContent: {
      title: 'Bizga qo\'shiling',
      description: 'Bugun boshlang!',
      ctaText: "Boshlash",
      ctaLink: '#contact',
    },
  },
  {
    type: 'contact',
    label: 'Contact (aloqa)',
    emoji: '📧',
    defaultContent: {
      title: "Bog'lanish",
      email: 'info@example.com',
      phone: '+998 90 123 45 67',
      address: 'Toshkent shahri',
      workingHours: 'Du-Sha: 9:00 — 18:00',
    },
  },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ──────────────────────────────────────────────────

export function EditorTab({
  schema,
  setSchema,
  saving,
  onSave,
}: {
  schema: SchemaShape;
  setSchema: (s: SchemaShape) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const pages = Array.isArray(schema.pages) ? schema.pages : [];
  const settings = schema.settings ?? {};

  return (
    <div className="space-y-5">
      {/* Site basics */}
      <SiteBasicsCard schema={schema} setSchema={setSchema} settings={settings} />

      {/* Pages */}
      {pages.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500 text-sm">
          Sahifalar topilmadi.
        </div>
      )}
      {pages.map((page, pi) => (
        <PageCard
          key={page.slug ?? `page-${pi}`}
          page={page}
          pageIndex={pi}
          totalPages={pages.length}
          schema={schema}
          setSchema={setSchema}
        />
      ))}

      {/* Add new page */}
      <button
        type="button"
        onClick={() => {
          const next = clone(schema);
          if (!Array.isArray(next.pages)) next.pages = [];
          const slug = `sahifa-${(next.pages?.length ?? 0) + 1}`;
          next.pages!.push({
            slug,
            title: `Yangi sahifa ${(next.pages?.length ?? 0) + 1}`,
            sections: [],
          });
          setSchema(next);
        }}
        className="w-full py-5 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-purple-500 hover:bg-purple-500/5 text-zinc-500 hover:text-white text-sm font-bold transition flex items-center justify-center gap-2"
      >
        <FilePlus2 className="w-4 h-4" />
        Yangi sahifa qo&apos;shish
      </button>

      {/* Sticky save */}
      <div className="sticky bottom-4 flex justify-end">
        <motion.button
          type="button"
          onClick={onSave}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-2xl shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saqlanmoqda...' : 'Barcha o\'zgarishlarni saqlash'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Site Basics (siteName + colors + font) ─────────────────────

function SiteBasicsCard({
  schema,
  setSchema,
  settings,
}: {
  schema: SchemaShape;
  setSchema: (s: SchemaShape) => void;
  settings: Settings;
}) {
  const update = (path: string, value: unknown) => {
    const next = clone(schema);
    if (path === 'siteName' || path === 'description' || path === 'language') {
      (next as AnyObj)[path] = value;
    } else {
      next.settings = { ...(next.settings ?? {}), [path]: value };
    }
    setSchema(next);
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-zinc-900 p-5 space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Palette className="w-4 h-4 text-purple-400" />
        Sayt asoslari
      </h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field
          label="Sayt nomi"
          value={String(schema.siteName ?? '')}
          onChange={(v) => update('siteName', v)}
        />
        <Field
          label="Til (uz/ru/en)"
          value={String(schema.language ?? 'uz')}
          onChange={(v) => update('language', v)}
        />
      </div>
      <FieldArea
        label="Sayt tavsifi (SEO)"
        value={String(schema.description ?? '')}
        onChange={(v) => update('description', v)}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorField
          label="Asosiy rang"
          value={String(settings.primaryColor ?? '#2563eb')}
          onChange={(v) => update('primaryColor', v)}
        />
        <ColorField
          label="Aksent"
          value={String(settings.accentColor ?? '#7c3aed')}
          onChange={(v) => update('accentColor', v)}
        />
        <ColorField
          label="Fon"
          value={String(settings.bgColor ?? '#ffffff')}
          onChange={(v) => update('bgColor', v)}
        />
        <ColorField
          label="Matn"
          value={String(settings.textColor ?? '#111827')}
          onChange={(v) => update('textColor', v)}
        />
      </div>
      <Field
        label="Shrift (Google Font nomi)"
        value={String(settings.font ?? 'Inter')}
        onChange={(v) => update('font', v)}
        placeholder="Inter / Poppins / Playfair Display"
      />
    </section>
  );
}

// ── Page Card ──────────────────────────────────────────────────

function PageCard({
  page,
  pageIndex,
  totalPages,
  schema,
  setSchema,
}: {
  page: Page;
  pageIndex: number;
  totalPages: number;
  schema: SchemaShape;
  setSchema: (s: SchemaShape) => void;
}) {
  const [open, setOpen] = useState(pageIndex === 0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const isHome = page.slug === 'home' || pageIndex === 0;

  const updatePage = (mut: (p: Page) => void) => {
    const next = clone(schema);
    const pages = Array.isArray(next.pages) ? next.pages : [];
    if (!pages[pageIndex]) return;
    mut(pages[pageIndex]);
    setSchema(next);
  };

  const movePage = (dir: -1 | 1) => {
    const next = clone(schema);
    const pages = Array.isArray(next.pages) ? next.pages : [];
    const j = pageIndex + dir;
    if (j < 0 || j >= pages.length) return;
    [pages[pageIndex], pages[j]] = [pages[j], pages[pageIndex]];
    setSchema(next);
  };

  const deletePage = () => {
    if (!confirm(`"${page.title || page.slug}" sahifasini o'chirishni xohlaysizmi?`)) return;
    const next = clone(schema);
    next.pages = (next.pages ?? []).filter((_, i) => i !== pageIndex);
    setSchema(next);
  };

  const addSection = (template: SectionTemplate) => {
    updatePage((p) => {
      if (!Array.isArray(p.sections)) p.sections = [];
      p.sections.push({
        id: `${template.type}-${uid()}`,
        type: template.type,
        content: clone(template.defaultContent),
      });
    });
    setShowAddMenu(false);
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-white/5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 hover:bg-white/5 -m-2 p-2 rounded-lg transition text-left"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm flex items-center gap-2">
              {page.title || page.slug || `Sahifa ${pageIndex + 1}`}
              {isHome && (
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300">
                  Bosh
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 truncate">
              /{page.slug || '?'} · {sections.length} ta bo&apos;lim
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => movePage(-1)}
            disabled={pageIndex === 0}
            className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Yuqoriga"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => movePage(1)}
            disabled={pageIndex === totalPages - 1}
            className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title="Pastga"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          {!isHome && (
            <button
              type="button"
              onClick={deletePage}
              className="p-1.5 text-red-400 hover:text-red-300"
              title="Sahifani o'chirish"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="Sahifa sarlavhasi"
              value={String(page.title ?? '')}
              onChange={(v) => updatePage((p) => { p.title = v; })}
            />
            <Field
              label="Slug (URL)"
              value={String(page.slug ?? '')}
              onChange={(v) => updatePage((p) => { p.slug = v.toLowerCase().replace(/\s+/g, '-'); })}
            />
          </div>

          {sections.map((section, si) => (
            <SectionEditor
              key={section.id ?? `sec-${si}`}
              section={section}
              sectionIndex={si}
              pageIndex={pageIndex}
              totalSections={sections.length}
              schema={schema}
              setSchema={setSchema}
            />
          ))}

          {/* Add section */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu((s) => !s)}
              className="w-full py-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-purple-500 hover:bg-purple-500/5 text-zinc-500 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {showAddMenu ? 'Yopish' : "Yangi bo'lim qo'shish"}
            </button>
            {showAddMenu && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                {SECTION_TEMPLATES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => addSection(t)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900 hover:bg-purple-500/15 hover:text-purple-300 border border-white/5 text-left transition"
                  >
                    <span className="text-base">{t.emoji}</span>
                    <span className="text-xs font-semibold truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Section Editor ─────────────────────────────────────────────

function SectionEditor({
  section,
  sectionIndex,
  pageIndex,
  totalSections,
  schema,
  setSchema,
}: {
  section: Section;
  sectionIndex: number;
  pageIndex: number;
  totalSections: number;
  schema: SchemaShape;
  setSchema: (s: SchemaShape) => void;
}) {
  const [open, setOpen] = useState(false);
  const type = String(section.type ?? '').toLowerCase();
  const content = (section.content as AnyObj | undefined) ?? {};
  const topFields = TOP_FIELDS[type] ?? [
    { key: 'title', label: 'Sarlavha', type: 'text' as const },
  ];
  const itemFields = ITEM_FIELDS[type];
  const items = Array.isArray(content.items) ? (content.items as AnyObj[]) : null;

  const updateContent = (mut: (c: AnyObj) => void) => {
    const next = clone(schema);
    const pages = Array.isArray(next.pages) ? next.pages : [];
    const sections = Array.isArray(pages[pageIndex]?.sections) ? pages[pageIndex]!.sections! : [];
    const target = sections[sectionIndex];
    if (!target) return;
    target.content = target.content ?? {};
    mut(target.content as AnyObj);
    setSchema(next);
  };

  const moveSection = (dir: -1 | 1) => {
    const next = clone(schema);
    const pages = Array.isArray(next.pages) ? next.pages : [];
    const sections = Array.isArray(pages[pageIndex]?.sections) ? pages[pageIndex]!.sections! : [];
    const j = sectionIndex + dir;
    if (j < 0 || j >= sections.length) return;
    [sections[sectionIndex], sections[j]] = [sections[j], sections[sectionIndex]];
    setSchema(next);
  };

  const deleteSection = () => {
    if (!confirm(`Bu "${type}" bo'limini o'chirishni xohlaysizmi?`)) return;
    const next = clone(schema);
    const pages = Array.isArray(next.pages) ? next.pages : [];
    if (!pages[pageIndex]?.sections) return;
    pages[pageIndex]!.sections = pages[pageIndex]!.sections!.filter((_, i) => i !== sectionIndex);
    setSchema(next);
  };

  const duplicateSection = () => {
    const next = clone(schema);
    const pages = Array.isArray(next.pages) ? next.pages : [];
    const sections = Array.isArray(pages[pageIndex]?.sections) ? pages[pageIndex]!.sections! : [];
    const original = sections[sectionIndex];
    if (!original) return;
    const copy = clone(original);
    copy.id = `${type}-${uid()}`;
    sections.splice(sectionIndex + 1, 0, copy);
    setSchema(next);
  };

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-950/50 overflow-hidden">
      <div className="flex items-center gap-1 p-3 hover:bg-white/5 transition">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
          {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs uppercase tracking-wider text-purple-400">
              {type}
            </div>
            <div className="text-xs text-zinc-400 truncate">
              {String(content.title ?? content.heading ?? section.id ?? '—')}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => moveSection(-1)} disabled={sectionIndex === 0}
            className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Yuqoriga">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => moveSection(1)} disabled={sectionIndex === totalSections - 1}
            className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Pastga">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={duplicateSection}
            className="p-1.5 text-zinc-500 hover:text-white" title="Nusxalash">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={deleteSection}
            className="p-1.5 text-red-400 hover:text-red-300" title="O'chirish">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {topFields.map((f) =>
            f.type === 'textarea' ? (
              <FieldArea
                key={f.key}
                label={f.label}
                value={String(content[f.key] ?? '')}
                onChange={(v) => updateContent((c) => { c[f.key] = v; })}
                placeholder={f.placeholder}
              />
            ) : (
              <Field
                key={f.key}
                label={f.label}
                value={String(content[f.key] ?? '')}
                onChange={(v) => updateContent((c) => { c[f.key] = v; })}
                placeholder={f.placeholder}
              />
            )
          )}

          {itemFields && (
            <ItemsEditor
              items={items ?? []}
              fields={itemFields}
              onChange={(newItems) => updateContent((c) => { c.items = newItems; })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Items Editor (add/remove/reorder) ──────────────────────────

function ItemsEditor({
  items,
  fields,
  onChange,
}: {
  items: AnyObj[];
  fields: FieldConfig[];
  onChange: (next: AnyObj[]) => void;
}) {
  const add = () => {
    const blank: AnyObj = {};
    fields.forEach((f) => { blank[f.key] = ''; });
    onChange([...items, blank]);
  };
  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const update = (i: number, key: string, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Elementlar ({items.length})
        </span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-semibold transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Qo&apos;shish
        </button>
      </div>

      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/5 bg-zinc-900 p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5">
            <span className="text-[10px] font-bold text-zinc-500">#{i + 1}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-zinc-500 hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Yuqoriga"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="text-zinc-500 hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Pastga"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-red-400 hover:text-red-300 p-1"
                title="O'chirish"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {fields.map((f) =>
            f.type === 'textarea' ? (
              <FieldArea
                key={f.key}
                label={f.label}
                value={String(item[f.key] ?? '')}
                onChange={(v) => update(i, f.key, v)}
                placeholder={f.placeholder}
              />
            ) : f.type === 'image' ? (
              <ImageField
                key={f.key}
                label={f.label}
                value={String(item[f.key] ?? '')}
                onChange={(v) => update(i, f.key, v)}
              />
            ) : (
              <Field
                key={f.key}
                label={f.label}
                value={String(item[f.key] ?? '')}
                onChange={(v) => update(i, f.key, v)}
                placeholder={f.placeholder}
                type={f.type === 'number' ? 'number' : 'text'}
              />
            )
          )}
        </div>
      ))}

      {items.length === 0 && (
        <button
          type="button"
          onClick={add}
          className="w-full py-6 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 text-xs font-semibold transition"
        >
          + Birinchi element qo&apos;shish
        </button>
      )}
    </div>
  );
}

// ── Inputs ─────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-purple-500 transition"
      />
    </label>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-purple-500 transition resize-y"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-zinc-800"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-2 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono focus:outline-none focus:border-purple-500 transition"
        />
      </div>
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
        <ImageIcon className="w-3 h-3" />
        {label}
      </span>
      <div className="mt-1 flex gap-2 items-start">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-purple-500 transition"
        />
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="preview"
            className="w-10 h-10 rounded-lg object-cover border border-zinc-800 bg-zinc-900"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
          />
        )}
      </div>
    </div>
  );
}
