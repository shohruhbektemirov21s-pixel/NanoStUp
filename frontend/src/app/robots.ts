import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://nanostup.uz'

  // SEO muhim: /uz, /ru, /en, /uz/pricing, /uz/builder sahifalari ochiq.
  // Private (dashboard, profile, checkout, admin) indexlanmaydi.
  return {
    rules: [
      // Barcha botlar uchun umumiy qoida
      {
        userAgent: '*',
        allow: [
          '/',
          '/uz/',
          '/ru/',
          '/en/',
          '/uz/pricing',
          '/ru/pricing',
          '/en/pricing',
          '/uz/builder',
          '/ru/builder',
          '/en/builder',
        ],
        disallow: [
          '/api/',
          '/uz/dashboard',
          '/ru/dashboard',
          '/en/dashboard',
          '/uz/profile',
          '/ru/profile',
          '/en/profile',
          '/uz/checkout',
          '/ru/checkout',
          '/en/checkout',
          '/uz/admin',
          '/ru/admin',
          '/en/admin',
          '/uz/17210707admin',
          '/ru/17210707admin',
          '/en/17210707admin',
          '/uz/site-admin',
          '/ru/site-admin',
          '/en/site-admin',
        ],
      },
      // Googlebot uchun alohida — to'liq crawl va indexlash
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/uz/',
          '/ru/',
          '/en/',
          '/uz/pricing',
          '/ru/pricing',
          '/en/pricing',
          '/uz/builder',
          '/ru/builder',
          '/en/builder',
        ],
        disallow: [
          '/api/',
          '/uz/dashboard',
          '/uz/profile',
          '/uz/checkout',
          '/uz/admin',
          '/uz/17210707admin',
          '/uz/site-admin',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
