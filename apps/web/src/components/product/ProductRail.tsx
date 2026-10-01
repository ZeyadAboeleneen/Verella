"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import ProductCard from "@/components/ProductCard";
import type { StoreProductView } from "@/lib/store/queries";
import type { Dictionary } from "@/lib/i18n";
import { EASE_OUT } from "@/components/motion/Reveal";

/** A titled, horizontally swipeable row of product cards (4 across on desktop). */
export function ProductRail({ title, products, labels }: { title: string; products: StoreProductView[]; labels: Dictionary["product"] }) {
  const reduce = useReducedMotion();
  if (!products.length) return null;
  return (
    // The whole row reveals once; cards never animate on their own, or each one
    // would rise as it scrolls in sideways and the row looks like it bounces.
    <motion.section
      className="mt-20 md:mt-28"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <h2 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-medium text-charcoal md:mb-8 md:text-3xl">{title}</h2>
      {/* Horizontal-only scroller: overflow-y hidden + pan-x so the row never moves up/down. */}
      <div className="no-scrollbar -mx-5 flex touch-pan-x snap-x snap-mandatory items-start gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-px-5 px-5 pb-2 md:mx-0 md:gap-6 md:scroll-px-0 md:px-0">
        {products.map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[calc(25%-18px)]">
            <ProductCard product={p} labels={labels} />
          </div>
        ))}
      </div>
    </motion.section>
  );
}

const KEY = "recently-viewed";
const MAX = 12;
const noopSubscribe = () => () => {};

function readIds(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Records this product as viewed (on the visitor's own device only) and shows
 * the ones they looked at before, newest first.
 */
export function RecentlyViewed({
  currentId,
  products,
  title,
  labels,
}: {
  currentId: number;
  products: StoreProductView[];
  title: string;
  labels: Dictionary["product"];
}) {
  // The stored list (server render: empty). The current product is filtered out below.
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(KEY) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );

  useEffect(() => {
    try {
      const next = [currentId, ...readIds().filter((id) => id !== currentId)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — nothing to remember.
    }
  }, [currentId]);

  let ids: number[] = [];
  try {
    ids = JSON.parse(stored);
  } catch {
    ids = [];
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  const list = ids.filter((id) => id !== currentId).map((id) => byId.get(id)).filter((p): p is StoreProductView => Boolean(p));
  return <ProductRail title={title} products={list} labels={labels} />;
}
