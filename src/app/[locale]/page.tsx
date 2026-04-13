import { setRequestLocale } from "next-intl/server";

import { HomeShell } from "@/features/home";
import { routing } from "@/i18n/routing";

type LocaleRouteParams = { locale: string };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
}: Readonly<{
  params: LocaleRouteParams | Promise<LocaleRouteParams>;
}>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  return <HomeShell />;
}
