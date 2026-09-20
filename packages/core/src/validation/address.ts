import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().max(100).optional(),
  recipientName: z.string().min(1, "Recipient name is required").max(191),
  phone: z.string().min(6, "Phone number is too short").max(32),
  governorate: z.string().min(1, "Governorate is required").max(100),
  city: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  street: z.string().min(1, "Street is required").max(255),
  building: z.string().max(50).optional(),
  floor: z.string().max(20).optional(),
  apartment: z.string().max(20).optional(),
  landmark: z.string().max(255).optional(),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
