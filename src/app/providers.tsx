"use client";

import { Toaster } from "sonner";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Toaster richColors closeButton position="top-center" />
    </>
  );
}
