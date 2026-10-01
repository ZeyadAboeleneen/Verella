"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Link from "@/components/LocaleLink";
import { VMark } from "@/components/brand/Logo";
import type { OfferView } from "@/lib/offers/queries";
import { CopyCode, useCountdown, type OfferLabels } from "./offer-bits";

const SLIDE_MS = 6000;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Slide: photo cross-fades in; the old text leaves fast so two texts never overlap. */
const SLIDE_VARIANTS = {
  enter: { opacity: 0, scale: 1.04 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.7, ease: EASE } },
};
const TEXT_VARIANTS = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.6, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * One promo banner: photo fills it, a soft dark fade on the text side, and the
 * highlight / title / text / code / button laid over it. Without a photo it
 * uses the charcoal-and-gold brand look.
 */
export function OfferCard({ offer, labels, preview = false }: { offer: OfferView; labels: OfferLabels; preview?: boolean }) {
  const countdown = useCountdown(offer.endsAt, labels);
  const kenBurns = !preview;

  return (
    <article className={`group/offer relative isolate flex h-full w-full items-center overflow-hidden bg-charcoal text-ivory ${preview ? "min-h-[220px] rounded-2xl" : ""}`}>
      {offer.image ? (
        <>
          {/* Ken Burns: a slow zoom and drift while the banner is on screen (alternating direction per offer). */}
          <div
            className={`absolute inset-0 -z-10 ${kenBurns ? (offer.id % 2 ? "ken-burns-a" : "ken-burns-b") : ""}`}
            style={kenBurns ? { animationDuration: `${SLIDE_MS / 1000 + 2}s` } : undefined}
          >
            <Image src={offer.image} alt="" fill sizes="(min-width: 1400px) 1300px, 100vw" className="object-cover" />
          </div>
          {/* Fade behind the text: from the start side in wide layouts, from the bottom on phones. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 hidden md:block rtl:hidden"
            style={{ background: "linear-gradient(90deg, rgba(20,20,20,0.78) 0%, rgba(20,20,20,0.45) 40%, rgba(20,20,20,0) 72%)" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 hidden rtl:md:block"
            style={{ background: "linear-gradient(270deg, rgba(20,20,20,0.78) 0%, rgba(20,20,20,0.45) 40%, rgba(20,20,20,0) 72%)" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 md:hidden"
            style={{ background: "linear-gradient(0deg, rgba(20,20,20,0.82) 0%, rgba(20,20,20,0.35) 55%, rgba(20,20,20,0.05) 100%)" }}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ background: "radial-gradient(70% 120% at 85% 50%, rgba(201,169,106,0.30) 0%, rgba(201,169,106,0) 60%), linear-gradient(135deg, #24201c 0%, #141414 70%)" }}
        >
          <VMark size={380} className="absolute -bottom-20 end-[6%] text-[rgba(201,169,106,0.16)]" />
        </div>
      )}

      {offer.href && !preview && <Link href={offer.href} aria-label={offer.title} tabIndex={-1} className="absolute inset-0 z-0" />}

      {countdown && (
        <span
          className="absolute end-4 top-4 z-[1] inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur-md md:end-6 md:top-6"
          style={{ background: "rgba(20,20,20,0.45)", border: "1px solid rgba(245,240,232,0.2)" }}
        >
          <Clock size={12} aria-hidden="true" />
          {countdown}
        </span>
      )}

      <motion.div
        variants={TEXT_VARIANTS}
        className="pointer-events-none relative z-[1] flex w-full flex-col gap-3 self-end p-6 pb-12 sm:p-8 sm:pb-12 md:max-w-[56%] md:self-center md:p-12 lg:p-16"
      >
        {offer.highlight && (
          <span className="inline-flex w-fit items-center rounded-full bg-champagne px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-charcoal md:text-sm">
            {offer.highlight}
          </span>
        )}
        <h3 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight tracking-tight sm:text-4xl md:text-5xl">{offer.title}</h3>
        {offer.body && (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed md:text-base" style={{ color: "rgba(245,240,232,0.82)" }}>
            {offer.body}
          </p>
        )}
        {(offer.code || offer.href) && (
          <div className="pointer-events-auto mt-2 flex flex-wrap items-center gap-3">
            {offer.href &&
              (preview ? (
                <span className="inline-flex h-11 items-center gap-2 rounded-full bg-ivory px-6 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal">
                  {offer.ctaLabel || labels.shopNow}
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </span>
              ) : (
                <Link
                  href={offer.href}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-ivory px-6 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:bg-champagne"
                >
                  {offer.ctaLabel || labels.shopNow}
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover/offer:translate-x-1 rtl:rotate-180 rtl:group-hover/offer:-translate-x-1" />
                </Link>
              ))}
            {offer.code && <CopyCode code={offer.code} labels={labels} className="h-11 px-4 text-ivory backdrop-blur-md hover:bg-ivory hover:text-charcoal" />}
          </div>
        )}
      </motion.div>
    </article>
  );
}

/**
 * Home-page promo carousel: one wide banner at a time, cross-fading every few
 * seconds (paused on hover/focus), with arrows, progress dots and swipe.
 */
export function OffersSection({ offers, labels }: { offers: OfferView[]; labels: OfferLabels }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = offers.length;

  useEffect(() => {
    if (count < 2 || paused || reduce) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, count, paused, reduce]);

  if (!count) return null;
  const current = index % count;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);
  const offer = offers[current];

  return (
    <section aria-roledescription="carousel" aria-label={labels.title} className="mx-auto max-w-[1400px] px-4 py-8 md:px-10 md:py-12">
      <div
        className="relative h-[420px] overflow-hidden rounded-[24px] bg-charcoal sm:h-[400px] md:h-[440px] lg:h-[480px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={offer.id}
            className="absolute inset-0"
            variants={SLIDE_VARIANTS}
            initial={reduce ? false : "enter"}
            animate="center"
            exit={reduce ? undefined : "exit"}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) < 60) return;
              // Swiping toward the reading direction's "start" moves forward.
              const rtl = document.documentElement.dir === "rtl";
              const forward = rtl ? info.offset.x > 0 : info.offset.x < 0;
              go(forward ? 1 : -1);
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${current + 1} / ${count}`}
          >
            <OfferCard offer={offer} labels={labels} />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={labels.previous}
              className="absolute start-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ivory backdrop-blur-md transition-colors hover:bg-ivory hover:text-charcoal md:flex"
              style={{ background: "rgba(20,20,20,0.35)", border: "1px solid rgba(245,240,232,0.25)" }}
            >
              <ChevronLeft size={20} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={labels.next}
              className="absolute end-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ivory backdrop-blur-md transition-colors hover:bg-ivory hover:text-charcoal md:flex"
              style={{ background: "rgba(20,20,20,0.35)", border: "1px solid rgba(245,240,232,0.25)" }}
            >
              <ChevronRight size={20} className="rtl:rotate-180" />
            </button>

            {/* Progress dots: the active one fills over the slide's duration. */}
            <div
              className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-2.5 py-2 backdrop-blur-md"
              style={{ background: "rgba(20,20,20,0.35)" }}
            >
              {offers.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1} / ${count}`}
                  aria-current={i === current}
                  className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${i === current ? "w-8" : "w-1.5"}`}
                  style={{ background: "rgba(245,240,232,0.35)" }}
                >
                  {i === current && (
                    <motion.span
                      key={`${o.id}-${index}-${paused}`}
                      className="absolute inset-y-0 start-0 bg-ivory"
                      initial={{ width: reduce || paused ? "100%" : "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: reduce || paused ? 0 : SLIDE_MS / 1000, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
