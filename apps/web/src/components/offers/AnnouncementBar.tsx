"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "@/components/LocaleLink";
import type { OfferView } from "@/lib/offers/queries";
import { CopyCode, type OfferLabels } from "./offer-bits";

const ROTATE_MS = 5500;

/** Dismissal is remembered per set of offers — a new or changed offer shows the bar again. */
const storageKey = (offers: OfferView[]) => `offers-bar-dismissed:${offers.map((o) => o.id).join(",")}`;
const noopSubscribe = () => () => {};

/**
 * Slim site-wide announcement strip above the navbar. Several announcements
 * rotate (pausing on hover/focus); visitors can close it.
 */
export function AnnouncementBar({ offers, labels, preview = false }: { offers: OfferView[]; labels: OfferLabels; preview?: boolean }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [closedNow, setDismissed] = useState(false);
  const [direction, setDirection] = useState(1);
  const key = storageKey(offers);
  // Read the remembered dismissal from storage (server render: not dismissed).
  const closedBefore = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (preview) return false;
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return false; // Storage blocked — just show the bar.
      }
    },
    () => false,
  );
  const dismissed = closedNow || closedBefore;

  useEffect(() => {
    if (offers.length < 2 || paused || reduce) return;
    const t = setTimeout(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % offers.length);
    }, ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, offers.length, paused, reduce]);

  if (!offers.length || dismissed) return null;
  const offer = offers[index % offers.length];
  const go = (step: number) => {
    setDirection(step);
    setIndex((i) => (i + step + offers.length) % offers.length);
  };

  const content = (
    <span className="flex min-w-0 items-center justify-center gap-2.5 md:gap-3">
      {offer.highlight && (
        <span className="hidden shrink-0 rounded-full bg-champagne px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal sm:inline-block">
          {offer.highlight}
        </span>
      )}
      <span className="truncate font-medium">{offer.title}</span>
      {offer.href && (
        <span className="hidden shrink-0 items-center gap-1 text-champagne underline-offset-4 group-hover/bar:underline md:inline-flex">
          {offer.ctaLabel || labels.shopNow}
          <ArrowRight size={12} className="rtl:rotate-180" aria-hidden="true" />
        </span>
      )}
    </span>
  );

  return (
    <div
      role="region"
      aria-label={labels.kicker}
      className="relative z-[60] bg-charcoal text-ivory"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Hairline of gold under the strip. */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,169,106,0.55), transparent)" }} />
      <div className="mx-auto flex h-10 max-w-[1400px] items-center gap-2 px-3 text-[12.5px] md:px-10">
        {offers.length > 1 ? (
          <button type="button" onClick={() => go(-1)} aria-label={labels.previous} className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-[rgba(245,240,232,0.6)] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-ivory md:flex">
            <ChevronLeft size={15} className="rtl:rotate-180" />
          </button>
        ) : (
          <span className="hidden w-7 md:block" />
        )}

        <div className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden" aria-live="polite">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={offer.id}
              custom={direction}
              initial={reduce ? false : { y: direction > 0 ? 14 : -14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: direction > 0 ? -14 : 14, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-w-0 items-center justify-center gap-2.5"
            >
              {offer.href && !preview ? (
                <Link href={offer.href} className="group/bar flex min-w-0 items-center">
                  {content}
                </Link>
              ) : (
                content
              )}
              {offer.code && <CopyCode code={offer.code} labels={labels} compact className="border-[rgba(201,169,106,0.6)] text-champagne hover:bg-champagne hover:text-charcoal" />}
            </motion.div>
          </AnimatePresence>
        </div>

        {offers.length > 1 && (
          <button type="button" onClick={() => go(1)} aria-label={labels.next} className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-[rgba(245,240,232,0.6)] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-ivory md:flex">
            <ChevronRight size={15} className="rtl:rotate-180" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (preview) return;
            setDismissed(true);
            try {
              localStorage.setItem(key, "1");
            } catch {
              // ignore
            }
          }}
          aria-label={labels.close}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[rgba(245,240,232,0.6)] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-ivory"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress dots on mobile, where the arrows are hidden. */}
      {offers.length > 1 && (
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1 md:hidden" aria-hidden="true">
          {offers.map((o, i) => (
            <span key={o.id} className={`h-[3px] rounded-full transition-all duration-300 ${i === index % offers.length ? "w-3 bg-champagne" : "w-[3px] bg-[rgba(255,255,255,0.3)]"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
