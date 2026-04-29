'use client';

import { motion } from 'framer-motion';
import { Image as ImageIcon, Save } from 'lucide-react';

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

export interface SchemaShape {
  siteName?: string;
  description?: string;
  language?: string;
  settings?: Record<string, unknown>;
  pages?: Page[];
  [key: string]: unknown;
}

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'image';
  placeholder?: string;
}

// ── Field configs (faqat matn + rasm) ──────────────────────────

const ITEM_FIELDS: Record<string, FieldConfig[]> = {
  features: [
    { key: 'title', label: 'Nomi', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'icon', label: 'Emoji ikon', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
  ],
  services: [
    { key: 'title', label: 'Xizmat nomi', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'icon', label: 'Emoji', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
  ],
  menu: [
    { key: 'name', label: 'Taom nomi', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'price', label: 'Narx', type: 'text' },
    { key: 'category', label: 'Kategoriya', type: 'text' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
  ],
  pricing: [
    { key: 'name', label: 'Tarif nomi', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
    { key: 'period', label: 'Davr', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
  ],
  testimonials: [
    { key: 'name', label: 'Mijoz ismi', type: 'text' },
    { key: 'role', label: 'Lavozim', type: 'text' },
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
    { key: 'value', label: 'Qiymat', type: 'text' },
    { key: 'label', label: 'Belgi', type: 'text' },
    { key: 'icon', label: 'Emoji', type: 'text' },
  ],
  gallery: [
    { key: 'src', label: 'Rasm URL', type: 'image' },
    { key: 'caption', label: 'Izoh', type: 'text' },
  ],
  blog: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'excerpt', label: 'Qisqa matn', type: 'textarea' },
    { key: 'author', label: 'Muallif', type: 'text' },
    { key: 'date', label: 'Sana', type: 'text' },
    { key: 'category', label: 'Kategoriya', type: 'text' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
  ],
  products: [
    { key: 'name', label: 'Mahsulot nomi', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
    { key: 'oldPrice', label: 'Eski narx', type: 'text' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
    { key: 'category', label: 'Kategoriya', type: 'text' },
    { key: 'badge', label: 'Belgi', type: 'text' },
  ],
  portfolio: [
    { key: 'title', label: 'Loyiha nomi', type: 'text' },
    { key: 'category', label: 'Kategoriya', type: 'text' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'client', label: 'Mijoz', type: 'text' },
  ],
  properties: [
    { key: 'title', label: 'Obyekt nomi', type: 'text' },
    { key: 'price', label: 'Narx', type: 'text' },
    { key: 'location', label: 'Manzil', type: 'text' },
    { key: 'bedrooms', label: 'Yotoq xonalari', type: 'number' },
    { key: 'bathrooms', label: 'Hammomlar', type: 'number' },
    { key: 'area', label: 'Maydon', type: 'text' },
    { key: 'image', label: 'Rasm URL', type: 'image' },
  ],
  timeline: [
    { key: 'year', label: 'Yil/Bosqich', type: 'text' },
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
    { key: 'icon', label: 'Emoji', type: 'text' },
  ],
  logos: [
    { key: 'name', label: 'Kompaniya nomi', type: 'text' },
    { key: 'logo', label: 'Logo URL', type: 'image' },
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
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  pricing: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  testimonials: [{ key: 'title', label: 'Sarlavha', type: 'text' }],
  team: [{ key: 'title', label: 'Sarlavha', type: 'text' }],
  faq: [{ key: 'title', label: 'Sarlavha', type: 'text' }],
  gallery: [{ key: 'title', label: 'Sarlavha', type: 'text' }],
  blog: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  products: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  portfolio: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  properties: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  booking: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
    { key: 'submitText', label: 'Tugma matni', type: 'text' },
    { key: 'infoText', label: "Qo'shimcha matn", type: 'textarea' },
  ],
  timeline: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  logos: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
  ],
  video: [
    { key: 'title', label: 'Sarlavha', type: 'text' },
    { key: 'subtitle', label: 'Subtitr', type: 'text' },
    { key: 'videoUrl', label: 'Video URL', type: 'text' },
    { key: 'description', label: 'Tavsif', type: 'textarea' },
  ],
};

// ── Section type label (UI uchun chiroyli nom) ─────────────────

const TYPE_LABELS: Record<string, string> = {
  hero: 'Bosh banner',
  features: 'Afzalliklar',
  services: 'Xizmatlar',
  menu: 'Menyu',
  pricing: 'Tariflar',
  about: 'Biz haqimizda',
  testimonials: 'Mijozlar fikri',
  team: 'Jamoa',
  faq: 'Savol-javob',
  stats: 'Raqamlar',
  gallery: 'Galereya',
  cta: "Chaqiriq",
  contact: 'Aloqa',
  blog: 'Blog',
  products: 'Mahsulotlar',
  portfolio: 'Portfolio',
  properties: "Ko'chmas mulk",
  booking: 'Bron qilish',
  timeline: 'Tarix/jarayon',
  logos: 'Mijoz brendlar',
  video: 'Video',
};

// ── Helpers ────────────────────────────────────────────────────

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function asStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
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
  const pages: Page[] = Array.isArray(schema?.pages) ? (schema.pages as Page[]) : [];

  const updateSection = (
    pageIdx: number,
    sectionIdx: number,
    field: 'top' | 'item',
    key: string,
    value: unknown,
    itemIdx?: number,
  ) => {
    const next = clone(schema);
    const sec = next.pages?.[pageIdx]?.sections?.[sectionIdx];
    if (!sec) return;
    if (!sec.content || typeof sec.content !== 'object') sec.content = {};
    const content = sec.content as AnyObj;
    if (field === 'top') {
      content[key] = value;
    } else if (field === 'item' && itemIdx != null) {
      const items = Array.isArray(content.items) ? (content.items as AnyObj[]) : [];
      if (!items[itemIdx]) return;
      items[itemIdx] = { ...items[itemIdx], [key]: value };
      content.items = items;
    }
    setSchema(next);
  };

  const updateSiteName = (v: string) => {
    const next = clone(schema);
    next.siteName = v;
    setSchema(next);
  };

  if (pages.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500 text-sm">
        Sayt hali yaratilmagan.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sayt nomi */}
      <section className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
        <h2 className="text-sm font-bold mb-3">Sayt nomi</h2>
        <Field
          label="Nomi"
          value={asStr(schema.siteName)}
          onChange={updateSiteName}
          placeholder="Mening saytim"
        />
        <p className="mt-2 text-[11px] text-zinc-500">
          Bu nom brauzer yorlig'ida va Google qidiruvida ko'rinadi.
        </p>
      </section>

      {/* Sahifalar va sektsiyalar */}
      {pages.map((page, pageIdx) => {
        const sections = Array.isArray(page.sections) ? (page.sections as Section[]) : [];
        const pageTitle = asStr(page.title) || asStr(page.slug) || `Sahifa ${pageIdx + 1}`;
        return (
          <section
            key={`page-${pageIdx}`}
            className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="text-purple-400">📄</span>
                {pageTitle}
                <span className="text-[10px] font-normal text-zinc-500">
                  ({sections.length} bo&apos;lim)
                </span>
              </h2>
            </div>

            <div className="p-5 space-y-5">
              {sections.map((section, sIdx) => (
                <SectionEditor
                  key={section.id ?? `s-${sIdx}`}
                  section={section}
                  pageIdx={pageIdx}
                  sectionIdx={sIdx}
                  onChange={updateSection}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Pastki saqlash paneli */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-zinc-950/95 backdrop-blur border-t border-white/5 flex items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-500">
          O&apos;zgarishlar avtomatik saqlanmaydi. Tugmani bosing.
        </p>
        <motion.button
          type="button"
          onClick={onSave}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </motion.button>
      </div>
    </div>
  );
}

// ── SectionEditor ──────────────────────────────────────────────

function SectionEditor({
  section,
  pageIdx,
  sectionIdx,
  onChange,
}: {
  section: Section;
  pageIdx: number;
  sectionIdx: number;
  onChange: (
    pageIdx: number,
    sectionIdx: number,
    field: 'top' | 'item',
    key: string,
    value: unknown,
    itemIdx?: number,
  ) => void;
}) {
  const type = section.type ?? 'unknown';
  const label = TYPE_LABELS[type] ?? type;
  const content = (section.content && typeof section.content === 'object' ? section.content : {}) as AnyObj;
  const topFields = TOP_FIELDS[type] ?? [{ key: 'title', label: 'Sarlavha', type: 'text' as const }];
  const itemFields = ITEM_FIELDS[type] ?? [];
  const items = Array.isArray(content.items) ? (content.items as AnyObj[]) : [];

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-950/40">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white">{label}</h3>
        <span className="text-[10px] text-zinc-600 font-mono">{type}</span>
      </div>
      <div className="p-4 space-y-3">
        {topFields.map((f) => (
          <FieldByType
            key={f.key}
            field={f}
            value={asStr(content[f.key])}
            onChange={(v) => onChange(pageIdx, sectionIdx, 'top', f.key, v)}
          />
        ))}

        {itemFields.length > 0 && items.length > 0 && (
          <div className="pt-3 border-t border-white/5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Elementlar ({items.length})
            </p>
            {items.map((item, itemIdx) => (
              <div
                key={itemIdx}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2"
              >
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                  #{itemIdx + 1}
                </p>
                {itemFields.map((f) => (
                  <FieldByType
                    key={f.key}
                    field={f}
                    value={asStr(item[f.key])}
                    onChange={(v) => onChange(pageIdx, sectionIdx, 'item', f.key, v, itemIdx)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field by type ──────────────────────────────────────────────

function FieldByType({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === 'textarea') {
    return <FieldArea label={field.label} value={value} onChange={onChange} placeholder={field.placeholder} />;
  }
  if (field.type === 'image') {
    return <ImageField label={field.label} value={value} onChange={onChange} />;
  }
  return (
    <Field
      label={field.label}
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
      type={field.type === 'number' ? 'number' : 'text'}
    />
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
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.2';
            }}
          />
        )}
      </div>
    </div>
  );
}
