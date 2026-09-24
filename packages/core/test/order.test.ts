import { describe, expect, it } from "vitest";
import { computeOrderTotals, generateOrderNumber } from "../src/pricing/order";

describe("computeOrderTotals", () => {
  it("adds delivery and subtracts discounts", () => {
    expect(computeOrderTotals({ subtotalCents: 290000, discountTotalCents: 29000, deliveryFeeCents: 6000 })).toEqual({
      subtotal: "2900.00",
      discountTotal: "290.00",
      taxTotal: "0.00",
      deliveryFee: "60.00",
      grandTotal: "2670.00",
    });
  });

  it("clamps the grand total at zero", () => {
    expect(computeOrderTotals({ subtotalCents: 1000, discountTotalCents: 5000 }).grandTotal).toBe("0.00");
  });
});

describe("generateOrderNumber", () => {
  it("uses the VR- prefix, the UTC date and an 8-char hex suffix", () => {
    expect(generateOrderNumber(new Date("2026-09-24T23:30:00Z"))).toMatch(/^VR-260924-[0-9A-F]{8}$/);
  });

  it("doesn't repeat", () => {
    const numbers = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
    expect(numbers.size).toBe(200);
  });
});
