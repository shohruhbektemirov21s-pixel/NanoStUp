import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";

// ── SEO: "sayt yaratish" kalit so'zi uchun to'liq optimizatsiya ───────
// Maqsad: Google'da "sayt yaratish" qidiruvida 1-o'rin.
// - Exact-match H1 Hero'da bor ("Professional sayt yaratish...")
// - Meta title doimo "Sayt Yaratish" bilan boshlanadi
// - Structured data: Organization + WebSite + Service + FAQPage
// - Sitemap + robots + hreflang alternates to'liq
// - Google Search Console: public/googlee159c5a8be39946b.html HTML file metodi
export const metadata: Metadata = {
  metadataBase: new URL('https://nanostup.uz'),
  title: {
    template: '%s | NanoStUp AI',
    default: 'Sayt yaratish — AI bilan professional veb-sayt yaratish xizmati | NanoStUp',
  },
  description:
    "Sayt yaratish O'zbekistonda endi 1 daqiqa! Sun'iy intellekt (AI) bilan professional veb-sayt yaratish: biznes, do'kon, portfolio, restoran uchun tayyor shablonlar. Arzon va tez sayt yaratish xizmati — NanoStUp AI.",
  keywords: [
    'sayt yaratish', 'sayt yaratish xizmati', 'sayt yaratish narxi',
    'veb sayt yaratish', 'web sayt yaratish', 'sayt ochish', 'sayt yasash',
    'arzon sayt yaratish', 'tez sayt yaratish', 'bepul sayt yaratish',
    "O'zbekistonda sayt yaratish", 'Toshkentda sayt yaratish',
    'AI sayt yaratish', 'AI sayt builder', 'sun\'iy intellekt sayt',
    'biznes sayt yaratish', "do'kon sayt yaratish", 'restoran sayti yaratish',
    'landing page yaratish', 'portfolio sayt yaratish', 'onlayn sayt yaratish',
    'NanoStUp', 'nanostup.uz',
  ],
  authors: [{ name: 'NanoStUp Team', url: 'https://nanostup.uz' }],
  creator: 'NanoStUp AI',
  publisher: 'NanoStUp',
  applicationName: 'NanoStUp AI',
  category: 'Technology',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    alternateLocale: ['ru_RU', 'en_US'],
    url: 'https://nanostup.uz/uz',
    siteName: 'NanoStUp AI',
    title: 'Sayt yaratish — AI bilan 1 daqiqada professional veb-sayt',
    description:
      "O'zbekistonda #1 AI sayt yaratish xizmati. Biznesingiz uchun premium veb-sayt bir necha soniyada — matnlar, rasmlar va konversion dizayn bilan.",
    images: [
      {
        url: 'https://nanostup.uz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NanoStUp AI — Sayt yaratish xizmati',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sayt yaratish — NanoStUp AI',
    description: "O'zbekistonda eng tez va sifatli AI sayt yaratish xizmati.",
    images: ['https://nanostup.uz/og-image.png'],
  },
  alternates: {
    canonical: 'https://nanostup.uz/uz',
    languages: {
      'uz-UZ': 'https://nanostup.uz/uz',
      'ru-RU': 'https://nanostup.uz/ru',
      'en-US': 'https://nanostup.uz/en',
      'x-default': 'https://nanostup.uz/uz',
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  formatDetection: { telephone: true, email: true, address: true },
};




const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type AppLocale = (typeof routing.locales)[number];

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }
 
  // Receiving messages provided in `i18n/request.ts`
  const messages = await getMessages();
 
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-purple-500/30">
        <NextIntlClientProvider messages={messages}>
          {children}
          {/* ── SEO Structured Data (JSON-LD) ─────────────────────────
              Google uchun bitta @graph ichida: Organization, WebSite
              (SearchAction), Service (Offer) va FAQPage.
              "sayt yaratish" kalit so'zi bir nechta type'larda mavjud. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Organization",
                    "@id": "https://nanostup.uz/#organization",
                    "name": "NanoStUp AI",
                    "alternateName": ["NanoStUp", "Nano Start Up"],
                    "url": "https://nanostup.uz",
                    "logo": {
                      "@type": "ImageObject",
                      "url": "https://nanostup.uz/og-image.png",
                      "width": 1200,
                      "height": 630,
                    },
                    "description": "O'zbekistondagi #1 AI sayt yaratish platformasi. Sun'iy intellekt yordamida professional veb-sayt yaratish xizmati.",
                    "sameAs": [
                      "https://t.me/shohruhbek_2102",
                    ],
                    "contactPoint": {
                      "@type": "ContactPoint",
                      "contactType": "customer support",
                      "availableLanguage": ["Uzbek", "Russian", "English"],
                      "url": "https://t.me/shohruhbek_2102",
                    },
                  },
                  {
                    "@type": "WebSite",
                    "@id": "https://nanostup.uz/#website",
                    "url": "https://nanostup.uz",
                    "name": "NanoStUp — Sayt yaratish xizmati",
                    "description": "AI bilan sayt yaratish O'zbekistonda",
                    "inLanguage": ["uz-UZ", "ru-RU", "en-US"],
                    "publisher": { "@id": "https://nanostup.uz/#organization" },
                    "potentialAction": {
                      "@type": "SearchAction",
                      "target": {
                        "@type": "EntryPoint",
                        "urlTemplate": "https://nanostup.uz/uz/builder?prompt={search_term_string}",
                      },
                      "query-input": "required name=search_term_string",
                    },
                  },
                  {
                    "@type": "Service",
                    "@id": "https://nanostup.uz/#service",
                    "name": "Sayt yaratish xizmati",
                    "serviceType": "Web development",
                    "provider": { "@id": "https://nanostup.uz/#organization" },
                    "description": "Sun'iy intellekt yordamida professional veb-sayt yaratish xizmati. Biznes, do'kon, portfolio, restoran va boshqa sohalar uchun.",
                    "areaServed": { "@type": "Country", "name": "Uzbekistan" },
                    "inLanguage": ["uz", "ru", "en"],
                    "hasOfferCatalog": {
                      "@type": "OfferCatalog",
                      "name": "Sayt yaratish rejalari",
                      "itemListElement": [
                        {
                          "@type": "Offer",
                          "name": "Bepul sayt yaratish",
                          "itemOffered": { "@type": "Service", "name": "Bepul sayt yaratish (FREE)" },
                          "price": "0",
                          "priceCurrency": "UZS",
                        },
                        {
                          "@type": "Offer",
                          "name": "Pro tarif",
                          "itemOffered": { "@type": "Service", "name": "Premium sayt yaratish" },
                          "price": "199900",
                          "priceCurrency": "UZS",
                        },
                      ],
                    },
                  },
                  {
                    "@type": "FAQPage",
                    "@id": "https://nanostup.uz/#faq",
                    "mainEntity": [
                      {
                        "@type": "Question",
                        "name": "O'zbekistonda qanday qilib sayt yaratish mumkin?",
                        "acceptedAnswer": {
                          "@type": "Answer",
                          "text": "NanoStUp AI yordamida o'zbek tilida sayt yaratish juda oson. Shunchaki biznesingiz haqida ma'lumot bering va sun'iy intellekt bir necha soniya ichida tayyor veb-sayt yaratib beradi.",
                        },
                      },
                      {
                        "@type": "Question",
                        "name": "Sayt yaratish narxi qancha?",
                        "acceptedAnswer": {
                          "@type": "Answer",
                          "text": "Bepul tarifda 1 sahifali sayt yaratish mumkin. Professional sayt uchun 199 900 so'mdan boshlangan oylik obunalar mavjud.",
                        },
                      },
                      {
                        "@type": "Question",
                        "name": "Sayt yaratish qancha vaqt oladi?",
                        "acceptedAnswer": {
                          "@type": "Answer",
                          "text": "AI sayt yaratish bir necha soniyadan 1 daqiqagacha vaqt oladi. Shablonlardan tayyor sayt — darhol.",
                        },
                      },
                      {
                        "@type": "Question",
                        "name": "Qanday biznes uchun sayt yaratish mumkin?",
                        "acceptedAnswer": {
                          "@type": "Answer",
                          "text": "Restoran, kafe, do'kon, klinika, salon, portfolio, agentlik, o'quv markaz, fitnes zal, ko'chmas mulk, SaaS startap va blog uchun tayyor shablonlar mavjud.",
                        },
                      },
                    ],
                  },
                ],
              })
            }}
          />

        </NextIntlClientProvider>
      </body>

    </html>
  );
}
