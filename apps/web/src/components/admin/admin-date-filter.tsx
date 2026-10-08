"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PERIOD_OPTIONS } from "@/lib/admin/date-range";

const inputClass =
  "h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-on-surface";

/** Period dropdown (?period=…) with a "Custom range" option that shows from/to date inputs. */
export function AdminDateFilter({ emptyLabel = "All time" }: { emptyLabel?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const period = params.get("period") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const go = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter by date"
        value={period}
        onChange={(e) => {
          const v = e.target.value;
          go(v === "custom" ? { period: v } : { period: v || null, from: null, to: null });
        }}
        className={`${inputClass} ${period ? "font-medium" : "text-on-surface-variant"}`}
      >
        <option value="">{emptyLabel}</option>
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="custom">Custom range…</option>
      </select>
      {period === "custom" && (
        <>
          <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            From
            <input type="date" value={from} max={to || undefined} onChange={(e) => go({ from: e.target.value || null })} className={inputClass} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            To
            <input type="date" value={to} min={from || undefined} onChange={(e) => go({ to: e.target.value || null })} className={inputClass} />
          </label>
        </>
      )}
      {pending && <Loader2 size={14} className="animate-spin text-on-surface-variant" />}
    </div>
  );
}
