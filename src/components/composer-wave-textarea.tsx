"use client";

import { motion, useReducedMotion } from "framer-motion";
import { memo, useCallback, useState } from "react";

import { cn } from "@/lib/utils";

const BAR_COUNT = 28;

type ComposerWaveTextareaProps = Readonly<{
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  "aria-labelledby"?: string;
}>;

export const ComposerWaveTextarea = memo(function ComposerWaveTextarea({
  id,
  name,
  value,
  onChange,
  disabled,
  rows = 4,
  maxLength,
  placeholder,
  "aria-labelledby": ariaLabelledBy,
}: ComposerWaveTextareaProps) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const showWave = !disabled && (focused || value.length > 0);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-background/80 transition-[box-shadow,border-color] duration-300",
          showWave
            ? "border-primary/35 shadow-[0_0_0_3px_hsl(var(--primary)/0.12),0_12px_40px_-16px_hsl(var(--primary)/0.25)]"
            : "border-input shadow-sm",
        )}
      >
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          aria-labelledby={ariaLabelledBy}
          className="relative z-[1] min-h-[104px] w-full resize-y bg-transparent px-3.5 py-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-0 flex h-10 items-end justify-center gap-0.5 px-3 pb-2 transition-opacity duration-300",
            showWave ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => {
            const h = 4 + (i % 7) * 2;
            return (
              <motion.span
                key={i}
                className="origin-bottom w-0.5 rounded-full bg-gradient-to-t from-primary/25 via-primary/70 to-primary/40"
                style={{ height: h }}
                animate={
                  reduced || !showWave
                    ? undefined
                    : {
                        scaleY: [0.35, 1, 0.45, 0.9, 0.35],
                      }
                }
                transition={{
                  duration: 0.65 + (i % 9) * 0.04,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.022,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

ComposerWaveTextarea.displayName = "ComposerWaveTextarea";
