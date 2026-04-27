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
    default: 'NanoStUp AI - Build Your Website with AI',
  },
  description: 'Create professional multi-page websites in seconds with the power of Artificial Intelligence.',
  keywords: ['AI website builder', 'automatic website generation', 'NanoStUp', 'web design AI', 'O\'zbekiston AI'],
  authors: [{ name: 'NanoStUp Team' }],
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
    title: 'NanoStUp AI - Build Your Website with AI',
    description: 'Create professional multi-page websites in seconds with the power of Artificial Intelligence.',
    images: ['https://nanostup.uz/og-image.png'],
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
