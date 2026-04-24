'use client';

import { SiteRenderer } from './SiteRenderer';

interface Props {
  schema: Parameters<typeof SiteRenderer>[0]['schema'];
  siteTitle: string;
  updatedAt: string;
  locale: string;
  generatedByLabel: string;
}

export function PublicSiteView({ schema, updatedAt, locale, generatedByLabel }: Props) {
  const localeMap: Record<string, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' };
  const dateStr = new Date(updatedAt).toLocaleDateString(localeMap[locale] ?? 'uz-UZ');

  return (
    <main className="w-full">
      <SiteRenderer schema={schema} />
      <div className="py-4 px-6 text-center text-[11px] text-zinc-400 border-t border-zinc-100">
        {generatedByLabel} · {dateStr} · <a href="/" className="hover:text-zinc-600 transition-colors">NanoStUp AI</a>
      </div>
    </main>
  );
}
