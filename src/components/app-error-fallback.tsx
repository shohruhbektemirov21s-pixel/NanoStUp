"use client";

import type { ReactNode } from "react";

export type AppErrorFallbackProps = Readonly<{
  title: string;
  description: string;
  retryLabel: string;
  onReset: () => void;
  digest?: string;
  digestLabel?: string;
  footer?: ReactNode;
}>;

/**
 * Global va segment error boundary uchun bir xil fallback UI (oq ekranni oldini olish).
 */
export function AppErrorFallback({
  title,
  description,
  retryLabel,
  onReset,
  digest,
  digestLabel,
  footer,
}: AppErrorFallbackProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 py-10 text-center text-foreground">
      <div className="max-w-md space-y-3 rounded-2xl border border-border/70 bg-card/80 p-8 shadow-lg shadow-black/5 backdrop-blur-sm dark:shadow-black/30">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {digest && digestLabel ? (
          <p className="font-mono text-xs text-muted-foreground">{digestLabel.replace("{digest}", digest)}</p>
        ) : null}
        <button
          type="button"
          onClick={() => onReset()}
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {retryLabel}
        </button>
      </div>
      {footer ? <div className="max-w-md text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
