"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import en from "@messages/en.json";
import ru from "@messages/ru.json";
import uz from "@messages/uz.json";

import { AppErrorFallback } from "@/components/app-error-fallback";

type ErrorPageStrings = (typeof uz)["ErrorPage"];

function pickErrorCopy(locale: string | string[] | undefined): ErrorPageStrings {
  const code = Array.isArray(locale) ? locale[0] : locale;
  if (code === "en") {
    return en.ErrorPage;
  }
  if (code === "ru") {
    return ru.ErrorPage;
  }
  return uz.ErrorPage;
}

type LocaleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleSegmentError({ error, reset }: LocaleErrorProps) {
  const params = useParams();
  const L = useMemo(() => pickErrorCopy(params?.locale), [params?.locale]);

  useEffect(() => {
    console.error("[LocaleSegmentError]", error);
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
