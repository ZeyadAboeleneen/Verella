"use client";

import Link from "@/components/LocaleLink";
import NextImage from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Search, X } from "lucide-react";
import { DeleteButton } from "@/components/admin/delete-button";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/auth/rbac";

export interface CategoryListItem {
  id: number;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  /** Extra text the search box matches (Arabic name, slug…). */
  searchText?: string;
}

/** Numbered, reorderable category list — mirrors the hero-images/banners manager UX. */
export function CategoriesReorderList({
  items,
  reorderAction,
  toggleActiveAction,
  deleteAction,
  editHrefBase,
}: {
  items: CategoryListItem[];
  reorderAction: (orderedIds: number[]) => Promise<ActionResult>;
  toggleActiveAction: (id: number, isActive: boolean) => Promise<ActionResult>;
  deleteAction: (id: number) => Promise<ActionResult>;
  editHrefBase: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // While searching, reordering is off — moving within a filtered list would scramble the real order.
  const shown = q ? items.filter((c) => `${c.name} ${c.searchText ?? ""}`.toLowerCase().includes(q)) : items;

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    startTransition(async () => {
      const res = await reorderAction(ids);
      if ("error" in res) toast(res.error, "error");
      router.refresh();
    });
  }

  function toggleActive(id: number, isActive: boolean) {
    startTransition(async () => {
      const res = await toggleActiveAction(id, isActive);
      if ("error" in res) toast(res.error, "error");
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant/60 p-6 text-center text-sm text-on-surface-variant">
        No categories yet — add your first one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories by name or slug…"
          aria-label="Search categories"
          className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pe-10 ps-10 text-sm text-on-surface outline-none focus:border-on-surface"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
            <X size={15} />
          </button>
        )}
      </div>
      {q && (
        <p className="text-xs text-on-surface-variant">
          {shown.length} of {items.length} categories · clear the search to reorder
        </p>
      )}
      {shown.length === 0 && <p className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">No categories match “{query}”.</p>}
      {shown.map((item, i) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3"
        >
          <span className="w-6 shrink-0 text-center text-sm font-semibold text-on-surface-variant">{items.indexOf(item) + 1}</span>
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
            {item.imageUrl && <NextImage src={item.imageUrl} alt="" fill className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-on-surface">{item.name}</p>
            <p className="text-xs text-on-surface-variant">{item.isActive ? "Visible" : "Hidden"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!q && (<>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={pending || i === 0}
              aria-label="Move up"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={pending || i === items.length - 1}
              aria-label="Move down"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
            </>)}
            <label className="ms-1 flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                defaultChecked={item.isActive}
                disabled={pending}
                onChange={(e) => toggleActive(item.id, e.target.checked)}
              />
              Active
            </label>
            <Link
              href={`${editHrefBase}/${item.id}/edit`}
              aria-label={`Edit ${item.name}`}
              className="ms-1 text-on-surface-variant hover:text-primary"
            >
              <Pencil size={14} />
            </Link>
            <DeleteButton action={deleteAction.bind(null, item.id)} successMessage="Category deleted." />
          </div>
        </div>
      ))}
    </div>
  );
}
