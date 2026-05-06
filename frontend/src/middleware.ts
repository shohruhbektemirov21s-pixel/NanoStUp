import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// next-intl middleware: `/` → `/uz` (defaultLocale) avtomatik redirect.
// Google `https://nanostup.uz/` uchun 307 → `https://nanostup.uz/uz` oladi.
// Accept-Language: uz → `/uz`, ru → `/ru`, boshqa → `/uz` (default).
export default createMiddleware(routing);

export const config = {
  matcher: [
    // Barcha sahifalarni qamrab oladi, lekin Next.js ichki fayllarni o'tkazib yuboradi.
    '/((?!_next|_vercel|api|.*\\..*).*)',
  ],
};
