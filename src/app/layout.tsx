import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";

import { resolvePublicAppMetadataBase } from "@/lib/resolve-public-app-origin";

import { AppProviders } from "./providers";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext", "cyrillic-ext"],
  variable: "--font-sans",
  display: "swap",
});

const rootMetadataBase = resolvePublicAppMetadataBase();

export const metadata: Metadata = {
  ...(rootMetadataBase ? { metadataBase: rootMetadataBase } : {}),
  title: {
    default: "AI Website Builder",
    template: "%s | AI Website Builder",
  },
  description: "AI-driven no-code website builder — preview and ZIP export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={`${sans.variable} min-h-dvh font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
