"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { usePathname } from "@/i18n/navigation";

export default function LocaleTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
