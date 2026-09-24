"use client";

import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { VMark } from "@/components/brand/Logo";
import { EASE_OUT, RevealText } from "@/components/motion/Reveal";

export interface HeroSlide {
  slug: string;
  name: string;
  line: string;
  image: string | null;
}

const SLIDE_MS = 6500;

/**
 * Full-bleed hero that tours the store's worlds. Each slide wipes in over the
 * last with a slow push on the photo; neighbouring worlds are named at the
 * edges (as on AOI), and a segmented progress bar counts down to the next.
 */
export function HeroShowcase({
  slides,
  labels,
}: {
  slides: HeroSlide[];
  labels: { kicker: string; shopNow: string; scroll: string };
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 600], [0, 120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (reduce || paused || count < 2) return;
    const t = setTimeout(() => go(index + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, reduce, count, go]);

  if (count === 0) return null;
  const slide = slides[index];
  const prev = slides[(index - 1 + count) % count];
  const next = slides[(index + 1) % count];

  return (
    <section
      className="relative -mt-[var(--nav-offset,72px)] h-[100svh] min-h-[620px] overflow-hidden bg-charcoal text-ivory"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.slug}
          className="absolute inset-0"
          initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 0 100%)" }}
          animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0 0%)" }}
          exit={{ opacity: 1 }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        >
          {slide.image ? (
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.18 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduce ? 0 : SLIDE_MS / 1000 + 1.5, ease: "linear" }}
            >
              <Image src={slide.image} alt="" fill priority sizes="100vw" className="object-cover" />
            </motion.div>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <VMark size={320} className="text-champagne/10" />
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/30" />
          {/* Extra shade behind the copy so the champagne kicker holds up on bright photos. */}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/60 via-charcoal/15 to-transparent rtl:bg-gradient-to-l" />
        </motion.div>
      </AnimatePresence>

      {/* Big cropped mark drifting at the edge. */}
      <VMark size={640} className="pointer-events-none absolute -bottom-40 -end-40 text-champagne/[0.07]" />

      <motion.div
        className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-5 pb-28 md:px-16 md:pb-32"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <motion.p
          key={`k-${slide.slug}`}
          className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-champagne"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {labels.kicker} — {slide.name}
        </motion.p>
        <RevealText
          key={`h-${slide.slug}`}
          text={slide.line}
          as="h1"
          play
          delay={0.35}
          stagger={0.08}
          className="max-w-5xl font-[family-name:var(--font-display)] text-[clamp(3.2rem,11vw,10rem)] font-medium uppercase leading-[0.88] tracking-[-0.03em]"
        />
        <motion.div
          key={`c-${slide.slug}`}
          className="mt-8 flex items-center gap-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.6, ease: EASE_OUT }}
        >
          <Link
            href={`/store?category=${slide.slug}`}
            className="group relative inline-flex h-14 items-center overflow-hidden rounded-full bg-ivory px-8 text-xs font-medium uppercase tracking-[0.25em] text-charcoal"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-champagne transition-transform duration-500 ease-out group-hover:scale-x-100" />
            <span className="relative">
              {labels.shopNow} — {slide.name}
            </span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Neighbouring worlds at the edges, AOI-style. */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label={prev.name}
            className="group absolute start-4 top-1/2 z-20 hidden -translate-y-1/2 text-[11px] font-medium uppercase tracking-[0.3em] text-ivory/70 transition-colors hover:text-ivory md:block lg:start-6"
          >
            {/* Set vertically at the edge so it never collides with the headline. */}
            <span className="flex rotate-180 items-center gap-3 [writing-mode:vertical-rl]">
              {prev.name}
              <ChevronLeft size={14} className="rotate-90 transition-transform group-hover:-translate-y-1" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={next.name}
            className="group absolute end-4 top-1/2 z-20 hidden -translate-y-1/2 text-[11px] font-medium uppercase tracking-[0.3em] text-ivory/70 transition-colors hover:text-ivory md:block lg:end-6"
          >
            <span className="flex items-center gap-3 [writing-mode:vertical-rl]">
              {next.name}
              <ChevronRight size={14} className="rotate-90 transition-transform group-hover:translate-y-1" />
            </span>
          </button>
        </>
      )}

      {/* Counter + progress */}
      <div className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-[1400px] items-center gap-6 px-5 pb-8 md:px-16">
        <span className="text-xs tabular-nums tracking-[0.2em] text-ivory/80" dir="ltr">
          {String(index + 1).padStart(2, "0")} <span className="text-ivory/60">/ {String(count).padStart(2, "0")}</span>
        </span>
        <div className="flex flex-1 gap-1.5" dir="ltr">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              aria-label={s.name}
              onClick={() => go(i)}
              className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-ivory/20"
            >
              {i < index && <span className="absolute inset-0 bg-ivory/70" />}
              {i === index && (
                <motion.span
                  key={`${s.slug}-${paused}`}
                  className="absolute inset-0 origin-left bg-champagne"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: paused || reduce ? 0.02 : 1 }}
                  transition={{ duration: paused ? 0.3 : SLIDE_MS / 1000, ease: "linear" }}
                />
              )}
            </button>
          ))}
        </div>
        <span className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-ivory/60 md:flex">
          {labels.scroll}
          <motion.span animate={reduce ? undefined : { y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <ArrowDown size={14} />
          </motion.span>
        </span>
      </div>
    </section>
  );
}
