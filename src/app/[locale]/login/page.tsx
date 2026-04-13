import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AdminLoginForm } from "@/features/auth/components/admin-login-form";
import { Link } from "@/i18n/navigation";

type P = { locale: string } | Promise<{ locale: string }>;

export default async function LoginPage({ params }: Readonly<{ params: P }>) {
  const { locale } = await Promise.resolve(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Login" });
  const adminLoginRequired = Boolean(process.env.ADMIN_USERNAME?.trim());
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-muted/40" />}>
        <AdminLoginForm adminLoginRequired={adminLoginRequired} />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          ← {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
