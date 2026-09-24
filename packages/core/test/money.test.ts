import { describe, expect, it } from "vitest";
import { clampCents, formatMoney, fromCents, toCents } from "../src/money";

describe("money", () => {
  it("converts decimal strings to integer cents without float drift", () => {
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("0.1")).toBe(10);
    expect(toCents(1450)).toBe(145000);
    expect(toCents("1450.50")).toBe(145050);
  });

  it("rejects values that aren't numbers", () => {
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents(Number.NaN)).toThrow();
  });

  it("round-trips through fromCents as a 2dp string", () => {
    expect(fromCents(145000)).toBe("1450.00");
    expect(fromCents(5)).toBe("0.05");
  });

  it("formats EGP with Western digits in both languages", () => {
    expect(formatMoney(145000)).toBe("1,450 EGP");
    expect(formatMoney(145050)).toBe("1,450.5 EGP");
    expect(formatMoney(145000, "EGP", "ar")).toMatch(/^1[,٬]450 EGP$/);
  });

  it("never lets totals go negative", () => {
    expect(clampCents(-250)).toBe(0);
    expect(clampCents(99.6)).toBe(100);
  });
});
