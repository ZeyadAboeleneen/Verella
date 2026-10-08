import { toCents, addCents, clampCents } from "../money";

/**
 * percent / fixed — off the matching items.
 * bxgy_* — "buy X get Y": for every `buyQty` matching items bought, the next
 * `getQty` (the cheapest ones) are free, `value`% off, or `value` EGP off each.
 */
export type DiscountType = "percent" | "fixed" | "bxgy_free" | "bxgy_percent" | "bxgy_fixed";

export const isBuyXGetY = (type: DiscountType) => type === "bxgy_free" || type === "bxgy_percent" || type === "bxgy_fixed";
export type DiscountScope = "all" | "category" | "product";

/**
 * Plain DTO — deliberately decoupled from Drizzle row types so this package
 * has no dependency on @verella/db. apps/web maps DB rows to this shape
 * (joining discount_products / discount_categories into productIds/categoryIds).
 */
export interface DiscountLike {
  id: number;
  type: DiscountType;
  value: string; // decimal string, e.g. "10.00"
  scope: DiscountScope;
  code: string | null;
  minOrderTotal: string | null;
  maxUses: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  /** Buy X get Y: how many to buy, and how many get the reward. */
  buyQty?: number | null;
  getQty?: number | null;
  productIds?: number[];
  categoryIds?: number[];
}

export interface CartLineLike {
  productId: number;
  /** Primary category. */
  categoryId: number;
  /** Every category the product appears in (primary included), when known. */
  categoryIds?: number[];
  unitPriceCents: number;
  quantity: number;
}

export function isDiscountWindowOpen(discount: DiscountLike, now = new Date()): boolean {
  return discount.isActive && now >= discount.startsAt && now <= discount.endsAt;
}

export function lineMatchesDiscount(discount: DiscountLike, line: CartLineLike): boolean {
  if (discount.scope === "all") return true;
  if (discount.scope === "category") {
    return (line.categoryIds ?? [line.categoryId]).some((id) => discount.categoryIds?.includes(id) ?? false);
  }
  return discount.productIds?.includes(line.productId) ?? false;
}

function matchingSubtotalCents(discount: DiscountLike, lines: CartLineLike[]): number {
  return addCents(
    ...lines.filter((l) => lineMatchesDiscount(discount, l)).map((l) => l.unitPriceCents * l.quantity),
  );
}

/** Amount this discount removes, capped to what it actually applies to. Does not mutate usedCount. */
export function computeDiscountAmountCents(discount: DiscountLike, lines: CartLineLike[]): number {
  if (isBuyXGetY(discount.type)) return buyXGetYAmountCents(discount, lines);
  const base = matchingSubtotalCents(discount, lines);
  if (base <= 0) return 0;
  if (discount.type === "percent") {
    return clampCents((base * toCents(discount.value)) / 100 / 100, 0);
  }
  return clampCents(Math.min(toCents(discount.value), base), 0);
}

/**
 * Buy X get Y. Matching items are lined up from most to least expensive and
 * taken in groups of X + Y; in each full group the last Y (the cheapest)
 * get the reward. So the customer always pays for the pricier items.
 */
function buyXGetYAmountCents(discount: DiscountLike, lines: CartLineLike[]): number {
  const buy = Math.floor(discount.buyQty ?? 0);
  const get = Math.floor(discount.getQty ?? 0);
  if (buy < 1 || get < 1) return 0;
  const units: number[] = [];
  for (const l of lines) {
    if (!lineMatchesDiscount(discount, l)) continue;
    for (let q = 0; q < l.quantity; q++) units.push(l.unitPriceCents);
  }
  units.sort((a, b) => b - a);
  const group = buy + get;
  let total = 0;
  for (let start = 0; start + group <= units.length; start += group) {
    for (let k = start + buy; k < start + group; k++) {
      const price = units[k];
      if (discount.type === "bxgy_free") total += price;
      else if (discount.type === "bxgy_percent") total += (price * Math.min(100, toCents(discount.value) / 100)) / 100;
      else total += Math.min(toCents(discount.value), price);
    }
  }
  return clampCents(total, 0);
}

export interface DiscountValidationContext {
  now?: Date;
  orderSubtotalCents: number;
  /** How many times THIS user has already redeemed this discount (for perUserLimit). */
  userRedemptionCount?: number;
  /** Cart lines — needed to catch "valid code, but scoped to a product/category not in this cart". */
  lines?: CartLineLike[];
}

export function validateDiscount(
  discount: DiscountLike,
  ctx: DiscountValidationContext,
): { valid: true } | { valid: false; reason: string } {
  const now = ctx.now ?? new Date();
  if (!isDiscountWindowOpen(discount, now)) return { valid: false, reason: "This discount code has expired or is not yet active." };
  if (discount.minOrderTotal && ctx.orderSubtotalCents < toCents(discount.minOrderTotal)) {
    return { valid: false, reason: "Your order total is below the minimum required for this discount." };
  }
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    return { valid: false, reason: "This discount code has reached its usage limit." };
  }
  if (discount.perUserLimit !== null && (ctx.userRedemptionCount ?? 0) >= discount.perUserLimit) {
    return { valid: false, reason: "You've already used this discount code the maximum number of times allowed." };
  }
  if (ctx.lines && discount.scope !== "all" && !ctx.lines.some((l) => lineMatchesDiscount(discount, l))) {
    return {
      valid: false,
      reason: discount.scope === "category"
        ? "This discount code doesn't apply to any items in your cart."
        : "This discount code doesn't apply to any products in your cart.",
    };
  }
  return { valid: true };
}

export interface AppliedDiscount {
  discountId: number;
  amountCents: number;
  isCode: boolean;
}

export interface ApplyDiscountsResult {
  subtotalCents: number;
  discountTotalCents: number;
  /** Per-discount breakdown — each entry's amountCents is that discount's own share, not the order total. */
  appliedDiscounts: AppliedDiscount[];
  codeError?: string;
}

/**
 * Cart lines with the given (automatic) discounts taken off: each discount's
 * amount is spread over the lines it matches, in proportion to their totals.
 * Unit prices may become fractional cents — fine for computing a further
 * percentage/fixed discount, which is clamped to whole cents afterwards.
 */
function linesAfterDiscounts(lines: CartLineLike[], applied: AppliedDiscount[], discounts: DiscountLike[]): CartLineLike[] {
  const totals = lines.map((l) => l.unitPriceCents * l.quantity);
  for (const a of applied) {
    const d = discounts.find((x) => x.id === a.discountId);
    if (!d) continue;
    const idx = lines.map((l, i) => (lineMatchesDiscount(d, l) ? i : -1)).filter((i) => i >= 0);
    const base = idx.reduce((s, i) => s + totals[i], 0);
    if (base <= 0) continue;
    for (const i of idx) totals[i] = Math.max(0, totals[i] - (a.amountCents * totals[i]) / base);
  }
  return lines.map((l, i) => ({ ...l, unitPriceCents: l.quantity > 0 ? totals[i] / l.quantity : 0 }));
}

/**
 * Automatic (codeless) discounts always apply if their window is open and they
 * match at least one line. A single customer-entered code, if present, is
 * validated and stacked on top. Phase 1 keeps this simple by design — no
 * discount-stacking priority rules beyond "automatic + one code".
 */
export function applyDiscountsToCart(
  lines: CartLineLike[],
  autoDiscounts: DiscountLike[],
  codeDiscount: { discount: DiscountLike; userRedemptionCount?: number } | null,
  now = new Date(),
): ApplyDiscountsResult {
  const subtotalCents = addCents(...lines.map((l) => l.unitPriceCents * l.quantity));

  const applied: AppliedDiscount[] = [];

  for (const d of autoDiscounts) {
    if (d.code) continue; // codes only apply when entered explicitly
    if (!isDiscountWindowOpen(d, now)) continue;
    const amount = computeDiscountAmountCents(d, lines);
    if (amount > 0) applied.push({ discountId: d.id, amountCents: amount, isCode: false });
  }

  let codeError: string | undefined;
  if (codeDiscount) {
    // A code applies to what the customer actually pays for each item — the
    // price after automatic discounts — not the original price. (A product's
    // compare-at price never matters here: its real price is already the lower one.)
    const afterAuto = linesAfterDiscounts(lines, applied, autoDiscounts);
    const afterAutoSubtotal = addCents(...afterAuto.map((l) => l.unitPriceCents * l.quantity));
    const validation = validateDiscount(codeDiscount.discount, {
      now,
      orderSubtotalCents: afterAutoSubtotal,
      userRedemptionCount: codeDiscount.userRedemptionCount,
      lines: afterAuto,
    });
    if (validation.valid) {
      const amount = computeDiscountAmountCents(codeDiscount.discount, afterAuto);
      if (amount > 0) applied.push({ discountId: codeDiscount.discount.id, amountCents: amount, isCode: true });
    } else {
      codeError = validation.reason;
    }
  }

  const rawTotal = addCents(...applied.map((a) => a.amountCents));
  const discountTotalCents = clampCents(Math.min(rawTotal, subtotalCents), 0);

  // If stacked discounts would exceed the subtotal, scale each discount's
  // recorded share down proportionally so order_discounts / discount_redemptions
  // rows sum to the true (clamped) total instead of over-reporting. The last
  // entry absorbs any rounding remainder so cents always add up exactly.
  let appliedDiscounts = applied;
  if (rawTotal > discountTotalCents && rawTotal > 0) {
    let remaining = discountTotalCents;
    appliedDiscounts = applied.map((a, i) => {
      const isLast = i === applied.length - 1;
      const share = isLast ? remaining : clampCents(Math.round((a.amountCents / rawTotal) * discountTotalCents), 0);
      remaining -= share;
      return { ...a, amountCents: share };
    });
  }

  return {
    subtotalCents,
    discountTotalCents,
    appliedDiscounts,
    codeError,
  };
}
