import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function NotFoundPage() {
  const locale = headers().get("x-next-intl-locale") ?? routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "NotFound" });

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        {t("home")}
      </Link>
    </main>
  );
}
