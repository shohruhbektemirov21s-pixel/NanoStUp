"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { MiniNav } from "./mini-nav";

export function MiniAppRoot({ children }: Readonly<{ children: ReactNode }>) {
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      const tw = window.Telegram?.WebApp;
      if (tw) {
        window.clearInterval(id);
        tw.ready();
        tw.expand();
        tw.setHeaderColor("hsl(220 33% 98%)");
        tw.setBackgroundColor("hsl(220 33% 98%)");
        const initData = tw.initData?.trim() ?? "";
        if (initData && !cancelled) {
          void fetch("/api/miniapp/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
            credentials: "include",
          }).finally(() => {
            if (!cancelled) {
              setAuthAttempted(true);
            }
          });
        } else if (!cancelled) {
          setAuthAttempted(true);
        }
      } else if (ticks > 80) {
        window.clearInterval(id);
        if (!cancelled) {
          setAuthAttempted(true);
        }
      }
    }, 50);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {!authAttempted ? (
        <div className="flex min-h-dvh items-center justify-center px-4 text-sm text-muted-foreground">…</div>
      ) : null}
      <div className={authAttempted ? "" : "hidden"}>
        <MiniNav />
        {children}
      </div>
    </div>
  );
}
