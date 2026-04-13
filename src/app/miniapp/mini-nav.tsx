"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/miniapp", label: "Bosh sahifa" },
  { href: "/miniapp/builder", label: "Sayt yaratish" },
  { href: "/miniapp/projects", label: "Loyihalar" },
  { href: "/miniapp/pricing", label: "Tariflar" },
  { href: "/miniapp/account", label: "Akkaunt" },
] as const;

export function MiniNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-20 border-b border-border/80 bg-card/95 px-3 py-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg gap-1 overflow-x-auto pb-1">
        {links.map(({ href, label }) => {
          const active = pathname === href || (href !== "/miniapp" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
