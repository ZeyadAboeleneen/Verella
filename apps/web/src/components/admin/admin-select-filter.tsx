"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Dropdown filter for server-side admin lists: keeps the choice in the URL
 * (?<param>=value) alongside other filters, and resets to page 1.
 */
export function AdminSelectFilter({
  param,
  label,
  allLabel,
  options,
}: {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const value = params.get(param) ?? "";

  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          next.delete("page");
          const qs = next.toString();
          startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
        }}
        className={`h-11 w-full rounded-xl border bg-surface-container-lowest pe-9 ps-3 text-sm outline-none focus:border-on-surface ${
          value ? "border-on-surface font-medium text-on-surface" : "border-outline-variant text-on-surface-variant"
        }`}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 size={14} className="pointer-events-none absolute end-8 top-1/2 -translate-y-1/2 animate-spin text-on-surface-variant" />}
    </div>
  );
}
