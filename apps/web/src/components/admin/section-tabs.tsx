"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function SectionTabs({ tabs }: { tabs: { label: string; href: string }[] }) {
  const pathname = stripLocalePrefix(usePathname());
  return (
    <div className="mb-6 flex gap-1 border-b border-outline-variant/60">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
