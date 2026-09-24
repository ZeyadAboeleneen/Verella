import { describe, expect, it } from "vitest";
import { addressSchema, checkoutSchema, EGYPT_GOVERNORATES, governorateLabel } from "../src";

const ADDRESS = { recipientName: "Mona", phone: "01012345678", governorate: "Dakahlia", street: "El Gomhoria St" };

describe("governorates", () => {
  it("lists all 27 with Arabic labels", () => {
    expect(EGYPT_GOVERNORATES).toHaveLength(27);
    expect(new Set(EGYPT_GOVERNORATES.map((g) => g.name)).size).toBe(27);
    expect(governorateLabel("Cairo", "ar")).toBe("القاهرة");
  });
});

describe("addressSchema", () => {
  it("accepts a complete address", () => {
    expect(addressSchema.safeParse(ADDRESS).success).toBe(true);
  });

  it("rejects a governorate that isn't in Egypt's list", () => {
    expect(addressSchema.safeParse({ ...ADDRESS, governorate: "Dubai" }).success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const base = { fulfillmentType: "delivery", newAddress: ADDRESS, paymentMethodCode: "cash_on_delivery" };

  it("accepts cash on delivery with a new address", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });

  it("requires an address for delivery", () => {
    expect(checkoutSchema.safeParse({ ...base, newAddress: undefined }).success).toBe(false);
  });

  it("requires a transfer screenshot for InstaPay and Vodafone Cash", () => {
    for (const paymentMethodCode of ["instapay", "vodafone_cash"]) {
      expect(checkoutSchema.safeParse({ ...base, paymentMethodCode }).success).toBe(false);
      expect(checkoutSchema.safeParse({ ...base, paymentMethodCode, paymentProofMediaId: 7 }).success).toBe(true);
    }
  });

  it("rejects unknown payment methods", () => {
    expect(checkoutSchema.safeParse({ ...base, paymentMethodCode: "bitcoin" }).success).toBe(false);
  });
});
