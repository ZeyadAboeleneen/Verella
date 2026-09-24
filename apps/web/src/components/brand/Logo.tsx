/**
 * Official Verella marks, from the brand asset pack (currentColor masters).
 * Lockups are applied as a CSS mask over `bg-current`, so they take their
 * colour from a text-* class — one file covers every palette variant, and the
 * ALL BRANDS descriptor is part of the artwork, so it can't be separated.
 *
 * Pack rules: clear space = the V mark's height on every side; primary lockup
 * never below 120px wide; V mark alone never below 24px.
 */

const LOCKUPS = {
  // Asset sheet: "Horizontal for website headers, signage and email signatures."
  horizontal: { src: "/brand/lockup-horizontal.svg", ratio: 7848 / 1829 },
  primary: { src: "/brand/lockup-primary.svg", ratio: 5456 / 1829 },
  stacked: { src: "/brand/lockup-stacked.svg", ratio: 5456 / 4214 },
  wordmark: { src: "/brand/wordmark.svg", ratio: 5456 / 1136 },
} as const;

export type LockupVariant = keyof typeof LOCKUPS;

export function Lockup({
  variant = "horizontal",
  height,
  className = "text-charcoal",
  label = "Verella",
}: {
  variant?: LockupVariant;
  height: number;
  className?: string;
  label?: string;
}) {
  const { src, ratio } = LOCKUPS[variant];
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ height, width: Math.round(height * ratio), mask, WebkitMask: mask }}
    />
  );
}

/** The double-V symbol — exact geometry from the asset pack (314 × 325 grid). */
export function VMark({ size, className = "text-champagne" }: { size: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 314 325"
      width={size}
      height={Math.round((size * 325) / 314)}
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <g stroke="currentColor" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 21 L157 304 L291.5 21" />
        <path d="M93.5 21 L157 154 L220.5 21" />
      </g>
    </svg>
  );
}
