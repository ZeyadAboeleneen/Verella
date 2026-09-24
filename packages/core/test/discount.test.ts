import { describe, expect, it } from "vitest";
import {
  applyDiscountsToCart,
  computeDiscountAmountCents,
  validateDiscount,
  type CartLineLike,
  type DiscountLike,
} from "../src/pricing/discount";

const NOW = new Date("2026-09-24T12:00:00Z");

function discount(overrides: Partial<DiscountLike> = {}): DiscountLike {
  return {
    id: 1,
    type: "percent",
    value: "10.00",
    scope: "all",
    code: null,
    minOrderTotal: null,
    maxUses: null,
    perUserLimit: null,
    usedCount: 0,
    startsAt: new Date("2026-01-01T00:00:00Z"),
    endsAt: new Date("2026-12-31T23:59:59Z"),
    isActive: true,
    ...overrides,
  };
}

// 2 × 1450 EGP fragrance (category 1) + 1 × 320 EGP lotion (category 3)
const LINES: CartLineLike[] = [
  { productId: 10, categoryId: 1, unitPriceCents: 145000, quantity: 2 },
  { productId: 20, categoryId: 3, unitPriceCents: 32000, quantity: 1 },
];

describe("computeDiscountAmountCents", () => {
  it("takes a percentage of the whole cart", () => {
    expect(computeDiscountAmountCents(discount(), LINES)).toBe(32200);
  });

  it("only counts lines in the discounted category", () => {
    expect(computeDiscountAmountCents(discount({ scope: "category", categoryIds: [3] }), LINES)).toBe(3200);
  });

  it("only counts the discounted product", () => {
    expect(computeDiscountAmountCents(discount({ scope: "product", productIds: [10] }), LINES)).toBe(29000);
  });

  it("caps a fixed discount at what it applies to", () => {
    const d = discount({ type: "fixed", value: "500.00", scope: "product", productIds: [20] });
    expect(computeDiscountAmountCents(d, LINES)).toBe(32000);
  });

  it("is zero when nothing matches", () => {
    expect(computeDiscountAmountCents(discount({ scope: "category", categoryIds: [99] }), LINES)).toBe(0);
  });
});

describe("validateDiscount", () => {
  const ctx = { now: NOW, orderSubtotalCents: 322000, lines: LINES };

  it("accepts an open, unused code", () => {
    expect(validateDiscount(discount({ code: "WELCOME" }), ctx)).toEqual({ valid: true });
  });

  it.each([
    ["expired", discount({ endsAt: new Date("2026-09-01T00:00:00Z") })],
    ["not started", discount({ startsAt: new Date("2026-10-01T00:00:00Z") })],
    ["switched off", discount({ isActive: false })],
    ["below the minimum order", discount({ minOrderTotal: "5000.00" })],
    ["used up", discount({ maxUses: 100, usedCount: 100 })],
    ["for products not in the cart", discount({ scope: "product", productIds: [99] })],
  ])("rejects a code that is %s", (_label, d) => {
    expect(validateDiscount(d, ctx).valid).toBe(false);
  });

  it("enforces the per-customer limit", () => {
    const d = discount({ perUserLimit: 1 });
    expect(validateDiscount(d, { ...ctx, userRedemptionCount: 0 }).valid).toBe(true);
    expect(validateDiscount(d, { ...ctx, userRedemptionCount: 1 }).valid).toBe(false);
  });
});

describe("applyDiscountsToCart", () => {
  it("applies automatic discounts and stacks one valid code", () => {
    const auto = discount({ id: 1, scope: "category", categoryIds: [3] }); // 10% of 320
    const code = discount({ id: 2, code: "VIP", type: "fixed", value: "100.00" });
    const result = applyDiscountsToCart(LINES, [auto], { discount: code }, NOW);
    expect(result.subtotalCents).toBe(322000);
    expect(result.appliedDiscounts).toEqual([
      { discountId: 1, amountCents: 3200, isCode: false },
      { discountId: 2, amountCents: 10000, isCode: true },
    ]);
    expect(result.discountTotalCents).toBe(13200);
    expect(result.codeError).toBeUndefined();
  });

  it("never applies a code-based discount automatically", () => {
    const result = applyDiscountsToCart(LINES, [discount({ code: "SECRET" })], null, NOW);
    expect(result.discountTotalCents).toBe(0);
  });

  it("reports why a code didn't apply without blocking the cart", () => {
    const expired = discount({ code: "OLD", endsAt: new Date("2026-01-02T00:00:00Z") });
    const result = applyDiscountsToCart(LINES, [], { discount: expired }, NOW);
    expect(result.discountTotalCents).toBe(0);
    expect(result.codeError).toMatch(/expired/);
  });

  it("clamps stacked discounts to the subtotal and splits the clamp exactly", () => {
    const a = discount({ id: 1, type: "fixed", value: "2000.00" });
    const b = discount({ id: 2, type: "fixed", value: "2000.00" });
    const c = discount({ id: 3, type: "percent", value: "33.00" });
    const result = applyDiscountsToCart(LINES, [a, b, c], null, NOW);
    expect(result.discountTotalCents).toBe(322000);
    const shares = result.appliedDiscounts.map((d) => d.amountCents);
    expect(shares.reduce((s, n) => s + n, 0)).toBe(322000);
    expect(shares.every((n) => n >= 0)).toBe(true);
  });

  it("handles an empty cart", () => {
    expect(applyDiscountsToCart([], [discount()], null, NOW)).toMatchObject({ subtotalCents: 0, discountTotalCents: 0 });
  });
});
