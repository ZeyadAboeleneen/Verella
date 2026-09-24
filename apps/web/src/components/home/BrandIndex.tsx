"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { BrandView } from "@/lib/store/queries";
import { Reveal, RevealText } from "@/components/motion/Reveal";

/**
 * Oversized brand roll-call. Hovering a name floats one of its product photos
 * after the cursor on a spring, like AOI's collection index.
 */
export function BrandIndex({
  brands,
  labels,
}: {
  brands: BrandView[];
  labels: { eyebrow: string; title: string; products: string };
}) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 250, damping: 28, mass: 0.6 });
  const y = useSpring(my, { stiffness: 250, damping: 28, mass: 0.6 });
  const hoveredBrand = brands.find((b) => b.name === hovered);

  if (brands.length === 0) return null;

  return (
    <section
      className="relative mx-auto max-w-[1400px] px-5 py-24 md:px-16 md:py-32"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => setHovered(null)}
    >
      <Reveal>
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-gold-ink">{labels.eyebrow}</p>
      </Reveal>
      <RevealText
        text={labels.title}
        className="mb-12 font-[family-name:var(--font-display)] text-5xl font-medium uppercase leading-none tracking-tight text-charcoal md:text-8xl"
      />

      <ul className="border-t border-charcoal/15">
        {brands.map((b, i) => (
          <li key={b.name} className="border-b border-charcoal/15">
            <Link
              href={`/store?brand=${encodeURIComponent(b.name)}`}
              onMouseEnter={() => setHovered(b.name)}
              className="group flex items-center justify-between gap-6 py-5 md:py-7"
            >
              <span className="flex items-baseline gap-4 md:gap-8">
                <span className="text-[11px] tabular-nums tracking-[0.2em] text-on-surface-variant">{String(i + 1).padStart(2, "0")}</span>
                <span
                  className={`font-[family-name:var(--font-display)] text-3xl font-medium uppercase tracking-tight transition-all duration-500 md:text-6xl ${
                    hovered && hovered !== b.name ? "text-charcoal/25" : "text-charcoal"
                  } group-hover:translate-x-3 rtl:group-hover:-translate-x-3`}
                >
                  {b.name}
                </span>
              </span>
              <span className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                {b.productCount} {labels.products}
                <ArrowUpRight size={18} className="text-charcoal transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!reduce && (
        <motion.div
          className="pointer-events-none absolute start-0 top-0 z-10 hidden md:block"
          style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        >
          <AnimatePresence mode="wait">
            {hoveredBrand?.image && (
              <motion.div
                key={hoveredBrand.name}
                className="relative h-72 w-56 overflow-hidden rounded-2xl"
                initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <Image src={hoveredBrand.image} alt="" fill sizes="224px" className="object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
