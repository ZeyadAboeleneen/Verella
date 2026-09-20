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
  quantity: z.coerce.number().int().min(1).max(50),
  notes: z.string().max(255).optional(),
});
export type CartItemInput = z.infer<typeof cartItemInputSchema>;

export const checkoutSchema = z
  .object({
    fulfillmentType: z.enum(["delivery", "pickup"]),
    addressId: z.number().int().positive().optional(),
    newAddress: addressSchema.optional(),
    guestContact: guestContactSchema.optional(),
    paymentMethodCode: z.enum(["cash_on_delivery", "instapay"]),
    discountCode: z.string().max(50).optional(),
    paymentProofMediaId: z.number().int().positive().optional(),
  })
  .refine((d) => d.fulfillmentType === "pickup" || d.addressId || d.newAddress, {
    message: "An address is required for delivery orders",
    path: ["addressId"],
  })
  .refine((d) => d.paymentMethodCode !== "instapay" || d.paymentProofMediaId, {
    message: "Please upload your InstaPay payment screenshot.",
    path: ["paymentProofMediaId"],
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;
