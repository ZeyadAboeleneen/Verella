"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { VMark } from "@/components/brand/Logo";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className="me-[0.25em] inline-block">
      {word}
    </motion.span>
  );
}

/** The brand statement, lit word by word as it scrolls through the viewport. */
export function Manifesto({ lines, signature }: { lines: string[]; signature: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const words = lines.flatMap((line, li) => line.split(" ").map((w) => ({ w, li })));

  return (
    <section ref={ref} className="relative overflow-hidden bg-ivory px-5 py-28 md:px-16 md:py-44">
      <motion.span className="pointer-events-none absolute -start-24 top-10 md:-start-10" style={reduce ? undefined : { rotate }}>
        <VMark size={420} className="text-beige/60" />
      </motion.span>
      <div className="relative mx-auto max-w-6xl">
        <p className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,7vw,6.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-charcoal">
          {reduce
            ? lines.join(" ")
            : words.map(({ w }, i) => (
                <Word key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
              ))}
        </p>
        <p className="mt-10 text-xs font-medium uppercase tracking-[0.4em] text-gold-ink">{signature}</p>
      </div>
    </section>
  );
}
