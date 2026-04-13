import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function AdminPage({ params }: Readonly<{ params: P }>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  await getTranslations({ locale, namespace: "Admin" });
  return <AdminDashboard locale={locale} />;
}
