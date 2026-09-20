import { randomBytes } from "node:crypto";
import { addCents, clampCents, fromCents } from "../money";

export interface OrderTotalsInput {
  subtotalCents: number;
  discountTotalCents: number;
  taxTotalCents?: number;
  deliveryFeeCents?: number;
}

export interface OrderTotals {
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  deliveryFee: string;
  grandTotal: string;
}

/** Returns decimal-string totals ready to insert into the orders table. */
export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const taxTotalCents = input.taxTotalCents ?? 0;
  const deliveryFeeCents = input.deliveryFeeCents ?? 0;
  const grandTotalCents = clampCents(
    addCents(input.subtotalCents, taxTotalCents, deliveryFeeCents) - input.discountTotalCents,
  );

  return {
    subtotal: fromCents(input.subtotalCents),
    discountTotal: fromCents(input.discountTotalCents),
    taxTotal: fromCents(taxTotalCents),
    deliveryFee: fromCents(deliveryFeeCents),
    grandTotal: fromCents(grandTotalCents),
  };
}

/**
 * Human-readable, sortable order number: HA-YYMMDD-XXXXXXXX. The suffix is
 * 8 random hex chars (~4.3 billion combinations/day) rather than 4 decimal
 * digits (10,000/day) — guest order lookup is unauthenticated, so a short
 * suffix would let someone enumerate real orders by brute force.
 */
export function generateOrderNumber(date = new Date()): string {
  const y = String(date.getUTCFullYear()).slice(2);
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `HA-${y}${m}${d}-${suffix}`;
}
