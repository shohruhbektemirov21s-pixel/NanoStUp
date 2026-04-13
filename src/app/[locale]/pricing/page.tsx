import { setRequestLocale } from "next-intl/server";

import { PricingView } from "@/features/pricing/components/pricing-view";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function PricingPage({ params }: Readonly<{ params: P }>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  return <PricingView />;
}
