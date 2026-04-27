import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: '%s | NanoStUp AI',
    default: 'Sayt Yaratish - Professional Veb-Sayt Yaratish Xizmati (NanoStUp AI)',
  },
  description: 'O\'zbekistonda eng tez va sifatli sayt yaratish xizmati. Sun\'iy intellekt (AI) yordamida professional veb-sayt yaratish endi 1 daqiqa ichida.',
  keywords: ['sayt yaratish', 'veb sayt yaratish', 'sayt ochish', 'sayt yasash', 'arzon sayt yaratish', 'tez sayt yaratish', 'O\'zbekiston sayt yaratish', 'AI sayt builder'],
  authors: [{ name: 'NanoStUp Team' }],
  verification: {
    google: 'BU_YERGA_GOOGLE_KODINI_QOYING', // TODO: User should replace this
  },
  viewport: 'width=device-width, initial-scale=1',

  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: 'https://nanostup.uz',
    siteName: 'NanoStUp AI',
    title: 'NanoStUp AI - Build Your Website with AI',
    description: 'Create professional multi-page websites in seconds with the power of Artificial Intelligence.',
    images: [
      {
        url: 'https://nanostup.uz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NanoStUp AI Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sayt Yaratish - NanoStUp AI',
    description: 'O\'zbekistonda eng tez va sifatli sayt yaratish xizmati.',
    images: ['https://nanostup.uz/og-image.png'],
  },
  alternates: {
    canonical: 'https://nanostup.uz/uz',
  },
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
          {/* SEO Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Service",
                "name": "Sayt Yaratish Xizmati",
                "provider": {
                  "@type": "Organization",
                  "name": "NanoStUp AI"
                },
                "description": "Sun'iy intellekt yordamida professional veb-sayt yaratish xizmati.",
                "areaServed": "UZ",
                "hasOfferCatalog": {
                  "@type": "OfferCatalog",
                  "name": "Sayt Yaratish Rejalari",
                  "itemListElement": [
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Bepul sayt yaratish"
                      }
                    },
                    {
                      "@type": "Offer",
                      "itemOffered": {
                        "@type": "Service",
                        "name": "Premium sayt yaratish"
                      }
                    }
                  ]
                },
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "O'zbekistonda qanday qilib sayt yaratish mumkin?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "NanoStUp AI yordamida o'zbek tilida sayt yaratish juda oson. Shunchaki o'z biznesingiz haqida ma'lumot bering va AI sizga bir necha soniya ichida tayyor sayt yaratib beradi."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Sayt yaratish narxi qancha?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Bizda bepul va premium tariflar mavjud. Oddiy sayt yaratish mutlaqo bepul, professional funksiyalar uchun esa hamyonbop obunalar taklif etamiz."
                    }
                  }
                ]
              })
            }}
          />

        </NextIntlClientProvider>
      </body>

    </html>
  );
}
