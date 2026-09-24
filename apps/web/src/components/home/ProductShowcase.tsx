"use client";

import Link from "@/components/LocaleLink";
import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { StoreCategoryView, StoreProductView } from "@/lib/store/queries";
import type { Dictionary } from "@/lib/i18n";
import { EASE_OUT, Reveal, RevealText } from "@/components/motion/Reveal";

/** "The Edit": tabbed product grid; switching worlds re-flows the cards with a layout animation. */
export function ProductShowcase({
  products,
  categories,
  labels,
  productLabels,
  limit = 8,
}: {
  products: StoreProductView[];
  categories: StoreCategoryView[];
  labels: Dictionary["home"]["showcase"];
  productLabels: Dictionary["product"];
  limit?: number;
}) {
  const [tab, setTab] = useState<string>("all");
  const tabs = useMemo(
    () => [
      { slug: "all", name: labels.all, count: products.length },
      ...categories
        .map((c) => ({ slug: c.slug, name: c.name, count: products.filter((p) => p.categorySlug === c.slug).length }))
        .filter((c) => c.count > 0),
    ],
    [categories, products, labels.all],
  );
  const shown = (tab === "all" ? products : products.filter((p) => p.categorySlug === tab)).slice(0, limit);

  return (
    <section className="mx-auto max-w-[1400px] px-5 py-24 md:px-16 md:py-32">
      <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-gold-ink">{labels.eyebrow}</p>
          </Reveal>
          <RevealText
            text={labels.title}
            className="font-[family-name:var(--font-display)] text-5xl font-medium uppercase leading-none tracking-tight text-charcoal md:text-8xl"
          />
        </div>
        <Link
          href="/store"
          className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-charcoal"
        >
          <span className="relative">
            {labels.viewAll}
            <span className="absolute -bottom-1 start-0 h-px w-full origin-left scale-x-100 bg-charcoal transition-transform duration-500 group-hover:scale-x-0 rtl:origin-right" />
          </span>
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </Link>
      </div>

      <LayoutGroup>
        <div className="no-scrollbar -mx-5 mb-10 flex gap-6 overflow-x-auto px-5 md:mx-0 md:gap-9 md:px-0" role="tablist">
          {tabs.map((t) => {
            const active = t.slug === tab;
            return (
              <button
                key={t.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.slug)}
                className={`relative shrink-0 pb-2 text-xs font-medium uppercase tracking-[0.25em] transition-colors ${
                  active ? "text-charcoal" : "text-on-surface-variant hover:text-charcoal"
                }`}
              >
                {t.name}
                <sup className="ms-1 text-[9px] tracking-normal text-gold-ink">{t.count}</sup>
                {active && (
                  <motion.span layoutId="showcase-tab" className="absolute inset-x-0 -bottom-px h-px bg-charcoal" transition={{ duration: 0.5, ease: EASE_OUT }} />
                )}
              </button>
            );
          })}
        </div>

        <motion.div layout className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-14">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: EASE_OUT }}
              >
                <ProductCard product={p} labels={productLabels} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </section>
  );
}
