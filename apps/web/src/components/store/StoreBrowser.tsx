"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { StoreCategoryView, StoreProductView } from "@/lib/store/queries";
import type { Dictionary } from "@/lib/i18n";
import { EASE_OUT } from "@/components/motion/Reveal";
import { VMark } from "@/components/brand/Logo";

type Sort = "featured" | "new" | "price-asc" | "price-desc";

/**
 * The store's filtering surface. The whole catalog is on the client, so
 * switching world, brand, sort or search re-flows the grid instantly with a
 * layout animation; the state mirrors into the URL so every view is shareable.
 */
export function StoreBrowser({
  products,
  categories,
  labels,
  productLabels,
}: {
  products: StoreProductView[];
  categories: StoreCategoryView[];
  labels: Dictionary["store"];
  productLabels: Dictionary["product"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [brand, setBrand] = useState(params.get("brand") ?? "");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "featured");
  const [inStock, setInStock] = useState(params.get("stock") === "1");
  const [drawer, setDrawer] = useState(false);
  // The drawer sits on the inline-end edge, so it slides in from the left in Arabic.
  const drawerFrom = typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "-100%" : "100%";

  // Header links (?category=…) land here while the page is already mounted,
  // so re-sync from the URL whenever it changes (adjusted during render
  // rather than in an effect, to avoid a cascading second render).
  const urlCategory = params.get("category") ?? "all";
  const urlBrand = params.get("brand") ?? "";
  const [syncedUrl, setSyncedUrl] = useState({ category: urlCategory, brand: urlBrand });
  if (syncedUrl.category !== urlCategory || syncedUrl.brand !== urlBrand) {
    setSyncedUrl({ category: urlCategory, brand: urlBrand });
    setCategory(urlCategory);
    setBrand(urlBrand);
  }

  useEffect(() => {
    const next = new URLSearchParams();
    if (category !== "all") next.set("category", category);
    if (brand) next.set("brand", brand);
    if (query.trim()) next.set("q", query.trim());
    if (sort !== "featured") next.set("sort", sort);
    if (inStock) next.set("stock", "1");
    const qs = next.toString();
    if (qs !== params.toString()) router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, brand, query, sort, inStock]);

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean) as string[])].sort(), [products]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter(
      (p) =>
        (category === "all" || p.categorySlug === category) &&
        (!brand || p.brand === brand) &&
        (!inStock || p.stockQty > 0) &&
        (!q || p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q)),
    );
    if (sort === "price-asc") list = [...list].sort((a, b) => a.priceValue - b.priceValue);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.priceValue - a.priceValue);
    if (sort === "new") list = [...list].sort((a, b) => b.id - a.id);
    // Sold-out pieces sink to the end so the first rows are always buyable.
    return [...list].sort((a, b) => Number(a.stockQty <= 0) - Number(b.stockQty <= 0));
  }, [products, category, brand, query, sort, inStock]);

  const tabs = [
    { slug: "all", name: labels.all, count: products.length },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, count: products.filter((p) => p.categorySlug === c.slug).length })),
  ];
  const activeFilters = (brand ? 1 : 0) + (inStock ? 1 : 0) + (sort !== "featured" ? 1 : 0);
  const sorts: { value: Sort; label: string }[] = [
    { value: "featured", label: labels.sortFeatured },
    { value: "new", label: labels.sortNew },
    { value: "price-asc", label: labels.sortPriceAsc },
    { value: "price-desc", label: labels.sortPriceDesc },
  ];

  return (
    <div>
      {/* Sticky bar: worlds + search + filters */}
      <div className="sticky top-[var(--nav-offset,64px)] z-30 -mx-5 border-y border-charcoal/10 bg-ivory/90 px-5 backdrop-blur-xl transition-[top] duration-500 md:-mx-16 md:px-16">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 py-3">
          <LayoutGroup id="store-tabs">
            <div className="no-scrollbar flex min-w-0 flex-1 gap-6 overflow-x-auto md:gap-8" role="tablist">
              {tabs.map((t) => {
                const active = category === t.slug;
                return (
                  <button
                    key={t.slug}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(t.slug)}
                    className={`relative shrink-0 py-2 text-[11px] font-medium uppercase tracking-[0.25em] transition-colors ${
                      active ? "text-charcoal" : "text-on-surface-variant hover:text-charcoal"
                    }`}
                  >
                    {t.name}
                    <sup className="ms-1 text-[9px] tracking-normal text-gold-ink">{t.count}</sup>
                    {active && <motion.span layoutId="store-tab" className="absolute inset-x-0 bottom-0 h-px bg-charcoal" transition={{ duration: 0.45, ease: EASE_OUT }} />}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <label className="relative hidden items-center md:flex">
            <Search size={14} className="pointer-events-none absolute start-3 text-on-surface-variant" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="h-9 w-56 rounded-full border border-charcoal/15 bg-transparent ps-9 pe-3 text-xs text-charcoal outline-none transition-all duration-300 placeholder:text-on-surface-variant focus:w-72 focus:border-charcoal"
            />
          </label>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="relative flex shrink-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-charcoal transition-opacity hover:opacity-60"
          >
            <SlidersHorizontal size={15} strokeWidth={1.6} />
            <span className="hidden sm:inline">{labels.filters}</span>
            {activeFilters > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-champagne px-1 text-[9px] tracking-normal text-charcoal">{activeFilters}</span>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1400px] items-center justify-between py-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant" aria-live="polite">
          {labels.results.replace("{n}", String(shown.length))}
        </p>
        {brand && (
          <button
            type="button"
            onClick={() => setBrand("")}
            className="flex items-center gap-2 rounded-full bg-charcoal px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-ivory"
          >
            {brand} <X size={12} />
          </button>
        )}
      </div>

      <label className="relative mb-8 flex items-center md:hidden">
        <Search size={14} className="pointer-events-none absolute start-4 text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="h-11 w-full rounded-full border border-charcoal/15 bg-transparent ps-10 pe-4 text-sm text-charcoal outline-none focus:border-charcoal"
        />
      </label>

      <motion.div layout className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
              transition={{ duration: 0.6, delay: Math.min(i, 8) * 0.04, ease: EASE_OUT }}
            >
              <ProductCard product={p} labels={productLabels} soldOutLabel={labels.soldOut} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {shown.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-24 text-center">
          <VMark size={48} className="mb-6 text-beige" />
          <p className="text-charcoal">{query ? labels.searchEmpty : labels.empty}</p>
        </motion.div>
      )}

      {/* Filter drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-charcoal/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="fixed inset-y-0 end-0 z-[61] flex w-full max-w-sm flex-col bg-ivory p-8 text-charcoal"
              initial={{ x: drawerFrom }}
              animate={{ x: 0 }}
              exit={{ x: drawerFrom }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              aria-label={labels.filters}
            >
              <div className="mb-10 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.3em]">{labels.filters}</p>
                <button type="button" onClick={() => setDrawer(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-container">
                  <X size={18} />
                </button>
              </div>

              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-on-surface-variant">{labels.sort}</p>
              <div className="mb-8 flex flex-wrap gap-2">
                {sorts.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSort(s.value)}
                    className={`rounded-full border px-4 py-2 text-xs transition-all duration-300 ${
                      sort === s.value ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/15 hover:border-charcoal"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-on-surface-variant">{labels.brand}</p>
              <div className="mb-8 flex flex-wrap gap-2">
                {["", ...brands].map((b) => (
                  <button
                    key={b || "all"}
                    type="button"
                    onClick={() => setBrand(b)}
                    className={`rounded-full border px-4 py-2 text-xs transition-all duration-300 ${
                      brand === b ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/15 hover:border-charcoal"
                    }`}
                  >
                    {b || labels.allBrands}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer items-center justify-between border-t border-charcoal/10 py-5 text-sm">
                {labels.inStockOnly}
                <span className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${inStock ? "bg-charcoal" : "bg-beige"}`}>
                  <motion.span
                    className="absolute top-1 h-4 w-4 rounded-full bg-ivory"
                    animate={{ insetInlineStart: inStock ? 24 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </span>
                <input type="checkbox" className="sr-only" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              </label>

              <div className="mt-auto flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBrand("");
                    setInStock(false);
                    setSort("featured");
                  }}
                  className="h-12 flex-1 rounded-full border border-charcoal text-xs font-medium uppercase tracking-[0.2em]"
                >
                  {labels.clear}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  className="h-12 flex-[2] rounded-full bg-charcoal text-xs font-medium uppercase tracking-[0.2em] text-ivory"
                >
                  {labels.results.replace("{n}", String(shown.length))}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
