import { Truck } from "lucide-react";

/** "Add X more for free delivery" bar; hidden when the free-delivery threshold is off. */
export function FreeShippingProgress({
  thresholdCents,
  amountCents,
  remainingLabel,
  unlockedLabel,
  money,
}: {
  thresholdCents: number;
  /** Order amount after discounts. */
  amountCents: number;
  /** Contains "{amount}". */
  remainingLabel: string;
  unlockedLabel: string;
  money: (cents: number) => string;
}) {
  if (thresholdCents <= 0) return null;
  const remaining = Math.max(0, thresholdCents - amountCents);
  const pct = Math.min(100, Math.round((amountCents / thresholdCents) * 100));
  const [before, after] = remainingLabel.split("{amount}");

  return (
    <div className="rounded-xl border border-beige bg-ivory/60 p-3">
      <p className="flex items-center gap-2 text-xs text-charcoal">
        <Truck size={14} className="shrink-0 text-gold-ink" aria-hidden="true" />
        {remaining === 0 ? (
          <span className="font-medium text-gold-ink">{unlockedLabel}</span>
        ) : (
          <span>
            {before}
            <span className="font-semibold" dir="ltr">
              {money(remaining)}
            </span>
            {after}
          </span>
        )}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-beige" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-gold-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
