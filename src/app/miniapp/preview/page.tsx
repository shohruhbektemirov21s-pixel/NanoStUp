"use client";

import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; siteName: string; previewSrcDoc: string };

function MiniAppPreviewInner() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get("site");
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [scriptReady, setScriptReady] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!siteId) {
      setState({ status: "error", message: "Sayt identifikatori (site) URLda yo‘q." });
      return;
    }

    const initData = window.Telegram?.WebApp?.initData ?? "";
    if (!initData) {
      setState({
        status: "error",
        message: "Telegram initData topilmadi. Iltimos, bot orqali Mini Appni oching.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/miniapp/preview?site=${encodeURIComponent(siteId)}`, {
        headers: { Authorization: `tma ${initData}` },
      });
      let payload: { previewSrcDoc?: string; siteName?: string; error?: string };
      try {
        payload = (await response.json()) as { previewSrcDoc?: string; siteName?: string; error?: string };
      } catch {
        setState({ status: "error", message: "Server javobi noto‘g‘ri formatda." });
        return;
      }
      if (!response.ok) {
        setState({ status: "error", message: payload.error ?? `HTTP ${response.status}` });
        return;
      }
      if (!payload.previewSrcDoc || !payload.siteName) {
        setState({ status: "error", message: "Server javobi to‘liq emas." });
        return;
      }
      setState({
        status: "ready",
        siteName: payload.siteName,
        previewSrcDoc: payload.previewSrcDoc,
      });
    } catch {
      setState({ status: "error", message: "Tarmoq xatosi." });
    }
  }, [siteId]);

  useEffect(() => {
    if (!scriptReady || !siteId) {
      return;
    }
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    void loadPreview();
  }, [scriptReady, siteId, loadPreview]);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <main className="flex min-h-dvh flex-col">
        <header className="border-b border-slate-200 px-4 py-3">
          <h1 className="text-sm font-semibold text-slate-900">
            {state.status === "ready" ? state.siteName : "Preview"}
          </h1>
          <p className="text-xs text-slate-500">Telegram Mini App</p>
        </header>

        {state.status === "loading" ? (
          <p className="p-4 text-sm text-slate-600">Yuklanmoqda…</p>
        ) : null}

        {state.status === "error" ? (
          <p className="p-4 text-sm text-red-700" role="alert">
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" ? (
          <iframe
            title="Preview"
            className="min-h-[70vh] w-full flex-1 border-0"
            srcDoc={state.previewSrcDoc}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : null}
      </main>
    </>
  );
}

export default function MiniAppPreviewPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-600">Yuklanmoqda…</p>}>
      <MiniAppPreviewInner />
    </Suspense>
  );
}
