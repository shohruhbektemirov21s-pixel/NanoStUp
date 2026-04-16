"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { clientApiUrl } from "@/lib/client-api-url";

export const BUILDER_SESSION_CHANGED_EVENT = "builder-session-changed";

export type BuilderMeWebUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  linkedTelegram: boolean;
};

export type BuilderMePayload = {
  authenticated?: boolean;
  isAdmin?: boolean;
  planTier?: string | null;
  subscriptionUntilMs?: number | null;
  billingAccountId?: string | null;
  serverTokenBalance?: number | null;
  webUser?: BuilderMeWebUser | null;
};

type Ctx = {
  me: BuilderMePayload | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const BuilderSessionContext = createContext<Ctx | null>(null);

export function BuilderSessionProvider({
  children,
  initialServerSnapshot,
}: Readonly<{ children: ReactNode; initialServerSnapshot?: { authenticated: boolean } }>) {
  const pathname = usePathname();
  const [me, setMe] = useState<BuilderMePayload>(() => ({
    authenticated: Boolean(initialServerSnapshot?.authenticated),
  }));
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const r = await fetch(clientApiUrl("/api/auth/builder/me"), {
        credentials: "include",
        cache: "no-store",
      });
      const d = (await r.json()) as BuilderMePayload;
      setMe(d);
    } catch {
      setMe({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refetch();
  }, [pathname, refetch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refetch();
      }
    };
    const onAuth = () => {
      void refetch();
    };
    window.addEventListener(BUILDER_SESSION_CHANGED_EVENT, onAuth);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(BUILDER_SESSION_CHANGED_EVENT, onAuth);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch]);

  const value = useMemo(() => ({ me, loading, refetch }), [me, loading, refetch]);

  return <BuilderSessionContext.Provider value={value}>{children}</BuilderSessionContext.Provider>;
}

export function useBuilderSession(): Ctx {
  const v = useContext(BuilderSessionContext);
  if (!v) {
    throw new Error("useBuilderSession must be used within BuilderSessionProvider");
  }
  return v;
}

export function notifyBuilderSessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BUILDER_SESSION_CHANGED_EVENT));
  }
}
