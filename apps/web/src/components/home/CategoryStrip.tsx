"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { VMark } from "@/components/brand/Logo";
import { EASE_OUT, RevealText } from "@/components/motion/Reveal";

export interface StripCategory {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  count: number;
}

/**
 * Collection strips in the spirit of AOI: every world is a tall panel with
 * its own photo; clicking one opens it wide, the photo settles from a zoom,
 * and the name, blurb and count rise in. On phones it stacks vertically.
 */
export function CategoryStrip({
  categories,
  labels,
  height = "h-[78vh] min-h-[560px]",
}: {
  categories: StripCategory[];
  labels: { explore: string; items: string };
  height?: string;
}) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  if (categories.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1.5 md:flex-row md:gap-2 ${height}`}>
      {categories.map((cat, i) => {
        const open = i === active;
        return (
          <motion.div
            key={cat.slug}
            className="relative min-h-[72px] cursor-pointer overflow-hidden rounded-2xl bg-charcoal text-ivory md:min-h-0"
            animate={{ flexGrow: open ? 6 : 1 }}
            initial={false}
            transition={{ duration: reduce ? 0 : 0.8, ease: EASE_OUT }}
            style={{ flexBasis: 0 }}
            onClick={() => setActive(i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setActive(i))}
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label={cat.name}
          >
            {cat.image ? (
              <motion.div
                className="absolute inset-0"
                animate={{ scale: open ? 1 : 1.25 }}
                initial={false}
                transition={{ duration: reduce ? 0 : 1.2, ease: EASE_OUT }}
              >
                <Image
                  src={cat.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 60vw, 100vw"
                  className={`object-cover transition-[filter,opacity] duration-700 ${open ? "opacity-100" : "opacity-50 brightness-75"}`}
                />
              </motion.div>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <VMark size={120} className="text-champagne/20" />
              </span>
            )}
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${
                open ? "bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" : "bg-charcoal/40"
              }`}
            />

            {/* Collapsed label — vertical on desktop, a row on phones. */}
            <AnimatePresence>
              {!open && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-between px-5 md:flex-col md:justify-between md:px-0 md:py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.3 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <span className="text-[11px] tracking-[0.3em] text-champagne md:order-2">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-medium uppercase tracking-[0.3em] md:[writing-mode:vertical-rl] md:rotate-180">
                    {cat.name}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Open state */}
            <AnimatePresence>
              {open && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <div className="max-w-md">
                    <p className="mb-3 text-[11px] tracking-[0.3em] text-champagne">
                      {String(i + 1).padStart(2, "0")} — {cat.count} {labels.items}
                    </p>
                    <RevealText
                      text={cat.name}
                      as="h3"
                      play
                      delay={0.25}
                      className="font-[family-name:var(--font-display)] text-4xl font-medium uppercase leading-none tracking-tight md:text-7xl"
                    />
                    {cat.description && (
                      <motion.p
                        className="mt-4 text-sm text-ivory/75 md:text-base"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6, ease: EASE_OUT }}
                      >
                        {cat.description}
                      </motion.p>
                    )}
                  </div>
                  <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
                    <Link
                      href={`/store?category=${cat.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="group inline-flex h-12 items-center gap-2 rounded-full bg-ivory px-6 text-xs font-medium uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-champagne"
                    >
                      {labels.explore}
                      <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
