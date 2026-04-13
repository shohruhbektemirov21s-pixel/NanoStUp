import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { DocumentLang } from "@/components/document-lang";
import { FixedLocaleDock } from "@/components/fixed-locale-dock";
import { LocaleBootstrap } from "@/components/locale-bootstrap";
import { PlatformFooter } from "@/components/platform-footer";
import { SiteNavbar } from "@/features/home/components/site-navbar";
import { isAppLocale } from "@/i18n/routing";
import { resolvePublicAppMetadataBase } from "@/lib/resolve-public-app-origin";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

type LocaleRouteParams = { locale: string };

export async function generateMetadata({
  params,
}: Readonly<{
  params: LocaleRouteParams | Promise<LocaleRouteParams>;
}>): Promise<Metadata> {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const metadataBase = resolvePublicAppMetadataBase();

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: {
      default: t("title"),
      template: `%s | ${t("titleBrand")}`,
    },
    description: t("description"),
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: LocaleRouteParams | Promise<LocaleRouteParams>;
}>) {
  const { locale } = await Promise.resolve(params);
  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <DocumentLang locale={locale} />
      <NextIntlClientProvider messages={messages}>
        <div className="flex min-h-dvh flex-col bg-gradient-to-b from-indigo-50/50 via-white to-sky-50/80 dark:from-slate-950 dark:via-background dark:to-indigo-950/20">
          <LocaleBootstrap />
          <SiteNavbar />
          <div className="flex min-h-0 flex-1 flex-col pb-24 sm:pb-20">{children}</div>
          <PlatformFooter />
          <FixedLocaleDock />
        </div>
      </NextIntlClientProvider>
    </>
  );
}
