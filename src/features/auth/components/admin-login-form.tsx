"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { loginAdminAction } from "@/app/[locale]/login/actions";

type Props = { adminLoginRequired?: boolean };

export function AdminLoginForm({ adminLoginRequired = false }: Readonly<Props>) {
  const t = useTranslations("Login");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const reduced = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locale = typeof params.locale === "string" ? params.locale : "uz";
  const next = searchParams.get("next");

  return (
    <motion.form
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-md rounded-2xl border border-white/25 bg-white/55 p-8 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/50"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await loginAdminAction(adminLoginRequired ? username : undefined, password);
          if (!res.ok) {
            setError(res.error ?? t("errorBad"));
            return;
          }
          router.push(next === "admin" ? `/${locale}/admin` : `/${locale}`);
          router.refresh();
        });
      }}
    >
      <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      {adminLoginRequired ? (
        <>
          <label className="mt-6 block text-sm font-medium text-foreground" htmlFor="admin-user">
            {t("username")}
          </label>
          <input
            id="admin-user"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border/80 bg-background/90 px-4 py-3 text-sm shadow-inner outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
          />
        </>
      ) : null}
      <label className={`${adminLoginRequired ? "mt-4" : "mt-6"} block text-sm font-medium text-foreground`} htmlFor="admin-pass">
        {t("password")}
      </label>
      <input
        id="admin-pass"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border/80 bg-background/90 px-4 py-3 text-sm shadow-inner outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
      />
      {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-95 disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </motion.form>
  );
}
