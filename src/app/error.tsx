"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import en from "@messages/en.json";
import ru from "@messages/ru.json";
import uz from "@messages/uz.json";

import { AppErrorFallback } from "@/components/app-error-fallback";

type ErrorPageStrings = (typeof uz)["ErrorPage"];

function pickErrorCopy(pathname: string | null): ErrorPageStrings {
  if (!pathname) {
    return uz.ErrorPage;
  }
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return en.ErrorPage;
  }
  if (pathname === "/ru" || pathname.startsWith("/ru/")) {
    return ru.ErrorPage;
  }
  return uz.ErrorPage;
}

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: ErrorPageProps) {
  const pathname = usePathname();
  const L = useMemo(() => pickErrorCopy(pathname), [pathname]);

  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <AppErrorFallback
      title={L.title}
      description={L.description}
      retryLabel={L.retry}
      digest={error.digest}
      digestLabel={L.digest}
      onReset={reset}
    />
  );
}
