"use client";

import { useEffect } from "react";

import uz from "@messages/uz.json";

import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const L = uz.GlobalError;

/**
 * Root layout xatoliklarida ishlaydi; o‘z html/body kerak.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-center text-foreground">
        <div className="max-w-md space-y-3 rounded-2xl border border-border/70 bg-card p-8 shadow-lg">
          <h1 className="text-2xl font-semibold tracking-tight">{L.title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{L.description}</p>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              {L.retry}
            </button>
            <a
              href="/uz"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {L.home}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
