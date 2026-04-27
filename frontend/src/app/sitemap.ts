import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://nanostup.uz'
  const locales = ['en', 'ru', 'uz']
  const paths = ['', '/pricing', '/login', '/register']

  const entries: MetadataRoute.Sitemap = []

  locales.forEach((locale) => {
    paths.forEach((path) => {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '' ? 1 : 0.8,
      })
    })
  })

  return entries
}
