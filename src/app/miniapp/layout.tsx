import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { MiniAppRoot } from "./mini-app-root";

export const metadata: Metadata = {
  title: "AI Website Builder — Telegram",
  description: "Telegram Mini App — veb bilan bir xil mahsulot.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MiniAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniAppRoot>{children}</MiniAppRoot>
    </>
  );
}
