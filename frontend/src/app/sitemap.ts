import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://nanostup.uz'
  const locales = ['uz', 'en', 'ru']
  const now = new Date()

  // Asosiy sahifalar (public routes only).
  // "/builder" public ravishda access bor (login so'rasa ham sahifasi SSR
  // bo'lmaydi, lekin URL sitemap'ga qo'shilishi mumkin).
  const publicPaths: { path: string; priority: number; changeFreq: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1.0, changeFreq: 'daily' },
    { path: '/builder', priority: 0.95, changeFreq: 'daily' },
    { path: '/pricing', priority: 0.9, changeFreq: 'weekly' },
    { path: '/register', priority: 0.6, changeFreq: 'monthly' },
    { path: '/login', priority: 0.4, changeFreq: 'monthly' },
  ]

  const entries: MetadataRoute.Sitemap = []

  // Har bir locale uchun har bir public sahifani qo'shamiz
  for (const locale of locales) {
    for (const { path, priority, changeFreq } of publicPaths) {
      const url = `${baseUrl}/${locale}${path}`
      const alternates: Record<string, string> = {}

      // hreflang alternates — har bir locale uchun
      for (const altLocale of locales) {
        alternates[altLocale] = `${baseUrl}/${altLocale}${path}`
      }

      entries.push({
        url,
        lastModified: now,
        changeFrequency: changeFreq,
        priority,
        alternates: {
          languages: alternates,
        },
      })
    }
  }

  return entries
}
