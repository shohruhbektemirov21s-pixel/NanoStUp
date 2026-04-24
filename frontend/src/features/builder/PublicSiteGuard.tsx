'use client';

import { useEffect, useState } from 'react';
import { Sparkles, LogIn, UserPlus, Eye } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/store/authStore';
import { SiteRenderer } from './SiteRenderer';

interface Props {
  schema: Parameters<typeof SiteRenderer>[0]['schema'];
  siteTitle: string;
  updatedAt: string;
  locale: string;
  generatedByLabel: string;
}

export function PublicSiteGuard({ schema, siteTitle, updatedAt, locale, generatedByLabel }: Props) {
  const { isAuthenticated, isTokenExpired } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const ok = isAuthenticated && !isTokenExpired();
    setAllowed(ok);
    setChecked(true);
  }, [isAuthenticated, isTokenExpired]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    const localeMap: Record<string, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' };
    const dateLocale = localeMap[locale] ?? 'uz-UZ';

    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-900/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">NanoStUp AI</span>
          </div>

          <h1 className="mt-4 text-2xl font-black text-white mb-2">{siteTitle}</h1>
          <p className="text-zinc-400 text-sm mb-1">
            {generatedByLabel} · {new Date(updatedAt).toLocaleDateString(dateLocale)}
          </p>

          <div className="mt-8 p-6 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl">
            <p className="text-white font-semibold mb-1">
              {locale === 'ru' ? 'Войдите, чтобы просмотреть сайт' :
               locale === 'en' ? 'Sign in to view this site' :
               'Saytni ko\'rish uchun kiring'}
            </p>
            <p className="text-zinc-400 text-sm mb-6">
              {locale === 'ru' ? 'Этот сайт создан с помощью NanoStUp AI. Для просмотра необходимо войти в аккаунт.' :
               locale === 'en' ? 'This site was created with NanoStUp AI. Sign in or create an account to view it.' :
               'Bu sayt NanoStUp AI yordamida yaratilgan. Ko\'rish uchun ro\'yxatdan o\'ting yoki kiring.'}
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-purple-900/30"
              >
                <LogIn className="w-4 h-4" />
                {locale === 'ru' ? 'Войти' : locale === 'en' ? 'Sign in' : 'Kirish'}
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold transition-all"
              >
                <UserPlus className="w-4 h-4" />
                {locale === 'ru' ? 'Зарегистрироваться' : locale === 'en' ? 'Create account' : 'Ro\'yxatdan o\'tish'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full">
      <SiteRenderer schema={schema} />
      <footer className="py-6 px-6 text-center text-xs text-zinc-400 border-t border-zinc-100">
        {generatedByLabel} · {new Date(updatedAt).toLocaleDateString(localeMap[locale] ?? 'uz-UZ')}
      </footer>
    </main>
  );
}

const localeMap: Record<string, string> = { en: 'en-US', ru: 'ru-RU', uz: 'uz-UZ' };
