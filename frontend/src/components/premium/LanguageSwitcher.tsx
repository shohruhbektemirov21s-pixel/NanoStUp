'use client';

import { useLocale } from 'next-intl';
import { routing, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xl">
      <Globe className="w-3.5 h-3.5 text-zinc-500 ml-2" />
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleLocaleChange(loc)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all uppercase",
            locale === loc 
              ? "bg-white/10 text-white shadow-lg" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
