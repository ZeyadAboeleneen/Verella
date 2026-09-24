"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DESCRIPTOR, DESCRIPTOR_ORDER, V_SCALE, WORDMARK, WORDMARK_ORDER } from "./lockup-paths";

const FULL_VIEWBOX = "0 0 7848 1829";
/** Just the V: the mark spans 314 × 325 units scaled by V_SCALE. */
const MARK_VIEWBOX = `0 0 ${Math.round(314 * V_SCALE)} 1829`;
const FULL_RATIO = 7848 / 1829;
const MARK_RATIO = (314 * V_SCALE) / 1829;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The official horizontal lockup, brought to life: the V draws itself in, the
 * letters rise left to right, and ALL BRANDS settles last. `compact` folds it
 * down to the V alone (used once the header is scrolled). Hovering redraws
 * the V. Colour comes from `className` (currentColor), so it stays on-palette.
 */
export function AnimatedLockup({
  height,
  compact = false,
  className = "text-charcoal",
}: {
  height: number;
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [drawKey, setDrawKey] = useState(0);

  const draw = (delay: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { pathLength: { duration: 0.9, delay, ease: EASE }, opacity: { duration: 0.1, delay } },
        };

  return (
    <motion.span
      role="img"
      aria-label="Verella"
      className={`inline-flex shrink-0 overflow-hidden ${className}`}
      style={{ height }}
      animate={{ width: height * (compact ? MARK_RATIO : FULL_RATIO) }}
      initial={false}
      transition={{ duration: 0.5, ease: EASE }}
      onHoverStart={() => !reduce && setDrawKey((k) => k + 1)}
    >
      <motion.svg
        viewBox={FULL_VIEWBOX}
        animate={{ viewBox: compact ? MARK_VIEWBOX : FULL_VIEWBOX }}
        initial={false}
        transition={{ duration: 0.5, ease: EASE }}
        height={height}
        className="h-full w-auto"
        preserveAspectRatio="xMinYMid meet"
        aria-hidden="true"
      >
        <g transform={`scale(${V_SCALE})`} fill="none" stroke="currentColor" strokeWidth={42} strokeLinecap="round" strokeLinejoin="round">
          <motion.path key={`o${drawKey}`} d="M22.5 21 L157 304 L291.5 21" {...draw(0)} />
          <motion.path key={`i${drawKey}`} d="M93.5 21 L157 154 L220.5 21" {...draw(0.25)} />
        </g>

        <motion.g animate={{ opacity: compact ? 0 : 1 }} initial={false} transition={{ duration: 0.3 }}>
          <g transform={WORDMARK.outer}>
            <g transform={WORDMARK.inner} fill="currentColor">
              {WORDMARK.paths.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  initial={reduce ? false : { opacity: 0, y: -2400 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.35 + WORDMARK_ORDER[i] * 0.45, ease: EASE }}
                />
              ))}
            </g>
          </g>
          <g transform={DESCRIPTOR.outer}>
            <g transform={DESCRIPTOR.inner} fill="currentColor">
              {DESCRIPTOR.paths.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1 + DESCRIPTOR_ORDER[i] * 0.4, ease: EASE }}
                />
              ))}
            </g>
          </g>
        </motion.g>
      </motion.svg>
    </motion.span>
  );
}
