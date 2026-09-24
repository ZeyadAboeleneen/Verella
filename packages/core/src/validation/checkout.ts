import { z } from "zod";
import { addressSchema } from "./address";

export const guestContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(191),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(6, "Phone number is too short").max(32),
});
export type GuestContactInput = z.infer<typeof guestContactSchema>;

export const cartItemInputSchema = z.object({
  storeProductId: z.number().int().positive(),
  /** Required when the product sells in variants; omitted for simple products. */
  variantId: z.number().int().positive().optional(),
  quantity: z.coerce.number().int().min(1).max(50),
  notes: z.string().max(255).optional(),
});
export type CartItemInput = z.infer<typeof cartItemInputSchema>;

export const PAYMENT_METHOD_CODES = ["cash_on_delivery", "instapay", "vodafone_cash", "card", "apple_pay"] as const;
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

/** Manual transfers: the customer pays outside the site and uploads a screenshot for admin review. */
export const WALLET_PAYMENT_METHODS: readonly PaymentMethodCode[] = ["instapay", "vodafone_cash"];
/** Paid through the online payment gateway. */
export const GATEWAY_PAYMENT_METHODS: readonly PaymentMethodCode[] = ["card", "apple_pay"];

export const checkoutSchema = z
  .object({
    fulfillmentType: z.enum(["delivery", "pickup"]),
    addressId: z.number().int().positive().optional(),
    newAddress: addressSchema.optional(),
    guestContact: guestContactSchema.optional(),
    paymentMethodCode: z.enum(PAYMENT_METHOD_CODES),
    discountCode: z.string().max(50).optional(),
    paymentProofMediaId: z.number().int().positive().optional(),
  })
  .refine((d) => d.fulfillmentType === "pickup" || d.addressId || d.newAddress, {
    message: "An address is required for delivery orders",
    path: ["addressId"],
  })
  .refine((d) => !WALLET_PAYMENT_METHODS.includes(d.paymentMethodCode) || d.paymentProofMediaId, {
    message: "Please upload your payment screenshot.",
    path: ["paymentProofMediaId"],
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;
