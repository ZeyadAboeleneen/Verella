"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({
  delay = 0,
  y = 28,
  className,
  children,
  ...rest
}: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Headline that rises word by word from behind a mask. Words (not letters)
 * so Arabic joins correctly.
 */
export function RevealText({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  stagger = 0.06,
  play,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  stagger?: number;
  /** Controlled mode — animate on this flag instead of on scroll into view. */
  play?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const MotionTag = motion[Tag];
  const trigger = play === undefined ? { whileInView: "shown", viewport: { once: true, margin: "-10% 0px" } } : { animate: play ? "shown" : "hidden" };

  return (
    <MotionTag className={className} initial={reduce ? false : "hidden"} {...trigger} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "110%" }, shown: { y: "0%" } }}
            transition={{ duration: 0.8, delay: delay + i * stagger, ease: EASE_OUT }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
