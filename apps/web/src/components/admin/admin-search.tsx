"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

/**
 * Search box for server-side admin lists: keeps the query in the URL (?q=),
 * debounced while typing, and resets to page 1 on every new search.
 */
export function AdminSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (value.trim() === initial.trim()) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("page");
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
    }, 300);
    return () => clearTimeout(t);
  }, [value, initial, params, pathname, router]);

  return (
    <div className="relative">
      {pending ? (
        <Loader2 size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 animate-spin text-on-surface-variant" />
      ) : (
        <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      )}
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pe-10 ps-10 text-sm text-on-surface outline-none focus:border-on-surface"
      />
      {value && (
        <button type="button" onClick={() => setValue("")} aria-label="Clear search" className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
