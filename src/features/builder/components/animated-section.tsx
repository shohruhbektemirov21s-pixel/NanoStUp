"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

type AnimatedSectionProps = Omit<HTMLMotionProps<"section">, "children"> & {
  children: React.ReactNode;
};

/**
 * Viewportga kirganda silliq animatsiya; `prefers-reduced-motion` da o‘chiriladi.
 */
export function AnimatedSection({ children, className, ...rest }: AnimatedSectionProps) {
  const reduced = useReducedMotion();

  return (
    <motion.section
      {...rest}
      className={className}
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22, margin: "0px 0px -8% 0px" }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.section>
  );
}
