"use client";

import { useEffect } from "react";

type DocumentLangProps = {
  locale: string;
};

export function DocumentLang({ locale }: Readonly<DocumentLangProps>) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
