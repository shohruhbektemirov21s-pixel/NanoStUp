import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NanoStUp AI — Sayt Yaratish Platformasi',
    short_name: 'NanoStUp',
    description: 'Sun\'iy intellekt yordamida professional veb-sayt yaratish platformasi. O\'zbekistonda #1 AI sayt builder.',
    start_url: '/uz',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#7c3aed',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  }
}
