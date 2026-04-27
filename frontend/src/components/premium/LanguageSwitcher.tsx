'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { routing, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Globe, ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Tashqarida bosilganda yopiladi
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleLocaleChange = (newLocale: string) => {
    setOpen(false);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <>
      {/* Desktop: barcha tillar inline */}
      <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xl">
        <Globe className="w-3.5 h-3.5 text-zinc-500 ml-2" />
        {routing.locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all uppercase',
              locale === loc
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
            )}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Mobile: kompakt dropdown */}
      <div ref={ref} className="md:hidden relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 h-10 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white uppercase active:scale-95 transition-all"
          aria-label="Til tanlash"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe className="w-3.5 h-3.5 text-zinc-400" />
          <span>{locale}</span>
          <ChevronDown className={cn('w-3 h-3 text-zinc-400 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute right-0 top-12 min-w-[100px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {routing.locales.map((loc) => (
              <button
                key={loc}
                role="option"
                aria-selected={locale === loc}
                onClick={() => handleLocaleChange(loc)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium uppercase transition-colors',
                  locale === loc
                    ? 'bg-purple-500/10 text-purple-300'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <span>{loc}</span>
                {locale === loc && <span className="text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
