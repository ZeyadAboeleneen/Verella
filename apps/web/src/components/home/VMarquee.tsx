"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { VMark } from "@/components/brand/Logo";

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * Endless ticker of brand lines separated by the V mark. It drifts on its own,
 * speeds up (and leans) with scroll velocity, and flips direction when the
 * visitor scrolls back up.
 */
export function VMarquee({
  items,
  baseSpeed = 3,
  reverse = false,
  tone = "dark",
}: {
  items: string[];
  /** Percent of one copy's width per second. */
  baseSpeed?: number;
  reverse?: boolean;
  tone?: "dark" | "light";
}) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });
  const skew = useTransform(velocity, [-2000, 0, 2000], [4, 0, -4]);
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);
  const direction = useRef(reverse ? -1 : 1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let move = direction.current * -baseSpeed * (delta / 1000);
    const f = factor.get();
    if (f < 0) direction.current = reverse ? 1 : -1;
    else if (f > 0) direction.current = reverse ? -1 : 1;
    move += direction.current * -baseSpeed * Math.abs(f) * (delta / 1000);
    baseX.set(baseX.get() + move);
  });

  const dark = tone === "dark";
  const run = (
    <span className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 md:px-10">{item}</span>
          <VMark size={28} className={dark ? "text-champagne" : "text-gold"} />
        </span>
      ))}
    </span>
  );

  return (
    <div
      className={`overflow-hidden border-y py-5 md:py-7 ${dark ? "border-ivory/10 bg-charcoal text-ivory" : "border-charcoal/10 bg-ivory text-charcoal"}`}
      aria-label={items.join(" · ")}
      role="marquee"
      dir="ltr"
    >
      <motion.div
        className="flex w-max whitespace-nowrap font-[family-name:var(--font-display)] text-3xl font-medium uppercase tracking-tight md:text-6xl"
        style={{ x, skewX: skew }}
        aria-hidden="true"
      >
        {run}
        {run}
      </motion.div>
    </div>
  );
}
