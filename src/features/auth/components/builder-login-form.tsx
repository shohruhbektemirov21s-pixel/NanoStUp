"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { notifyBuilderSessionChanged } from "@/components/builder-session-provider";
import { saasElevatedPanel } from "@/components/ui/saas-surface";
import { clientApiUrl } from "@/lib/client-api-url";
import { cn } from "@/lib/utils";

export function BuilderLoginForm() {
  const t = useTranslations("BuilderLogin");
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (!password.trim()) {
      toast.error(t("toastEmpty"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(clientApiUrl("/api/auth/builder/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contact: contact.trim(),
          password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(t("toastBad"));
        return;
      }
      toast.success(t("toastOk"));
      notifyBuilderSessionChanged();
      router.push("/");
      router.refresh();
    } catch {
      toast.error(t("toastNetwork"));
    } finally {
      setBusy(false);
    }
  }, [contact, password, router, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full max-w-md p-6 sm:p-8", saasElevatedPanel)}
    >
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Lock className="size-5" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>

      <label htmlFor="builder-contact" className="mt-6 block text-sm font-medium text-foreground">
        {t("contact")}
      </label>
      <input
        id="builder-contact"
        type="text"
        autoComplete="username"
        placeholder={t("contactPlaceholder")}
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        disabled={busy}
        className="mt-2 w-full rounded-2xl border border-border/80 bg-background px-4 py-3.5 text-sm shadow-inner outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
      />

      <label htmlFor="builder-pass" className="mt-5 block text-sm font-medium text-foreground">
        {t("password")}
      </label>
      <div className="relative mt-2">
        <input
          id="builder-pass"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3.5 pr-12 text-sm shadow-inner outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
        >
          {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>

      <motion.button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        whileTap={busy ? undefined : { scale: 0.98 }}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t("submit")}
      </motion.button>

      <p className="mt-4 text-center text-sm">
        <Link href="/builder-forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("linkForgot")}
        </Link>
      </p>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/builder-signup" className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("linkSignup")}
        </Link>
      </p>
    </motion.div>
  );
}
