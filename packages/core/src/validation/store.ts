import { z } from "zod";
import { slugSchema, decimalString, nullableDecimalString, requiredLocalizedText, optionalLocalizedText } from "./shared";

export const storeCategorySchema = z.object({
  slug: slugSchema,
  imageMediaId: z.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  name: requiredLocalizedText(191),
  description: optionalLocalizedText(500),
});
export type StoreCategoryInput = z.infer<typeof storeCategorySchema>;

export const storeVariantSchema = z.object({
  /** Present when editing an existing variant; absent for a new one. */
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(1, "Each variant needs a label").max(64),
  labelAr: z.string().trim().max(64).optional(),
  sku: z.string().trim().max(64).optional(),
  price: decimalString,
  compareAtPrice: nullableDecimalString.optional(),
  stockQty: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type StoreVariantInput = z.infer<typeof storeVariantSchema>;

export const storeProductSchema = z.object({
  categoryId: z.number().int().positive(),
  slug: slugSchema,
  sku: z.string().max(64).optional(),
  brand: z.string().trim().max(120).optional(),
  variantAxis: z.enum(["volume", "size", "color"]).default("volume"),
  /** Empty = a simple product priced and stocked by `price` / `stockQty`. */
  variants: z.array(storeVariantSchema).max(30).default([]),
  price: decimalString,
  compareAtPrice: nullableDecimalString.optional(),
  isBestSeller: z.boolean().default(false),
  isFeaturedHome: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  stockQty: z.coerce.number().int().min(0).default(0),
  name: requiredLocalizedText(191),
  description: optionalLocalizedText(1000),
  notes: optionalLocalizedText(255),
  mediaIds: z.array(z.number().int().positive()).max(10).default([]),
});
export type StoreProductInput = z.infer<typeof storeProductSchema>;

export const discountSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(191),
    type: z.enum(["percent", "fixed"]),
    value: decimalString,
    scope: z.enum(["all", "category", "product"]),
    code: z
      .string()
      .max(50)
      .transform((v) => v.toUpperCase())
      .refine((v) => /^[A-Z0-9_-]*$/.test(v), "Letters, numbers, hyphens and underscores only")
      .optional(),
    minOrderTotal: nullableDecimalString.optional(),
    maxUses: z.coerce.number().int().positive().nullable().optional(),
    perUserLimit: z.coerce.number().int().positive().nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().default(true),
    productIds: z.array(z.coerce.number().int().positive()).default([]),
    categoryIds: z.array(z.coerce.number().int().positive()).default([]),
  })
  .refine((d) => d.endsAt > d.startsAt, { message: "End date must be after start date", path: ["endsAt"] })
  .refine((d) => d.scope !== "product" || d.productIds.length > 0, {
    message: "Select at least one product",
    path: ["productIds"],
  })
  .refine((d) => d.scope !== "category" || d.categoryIds.length > 0, {
    message: "Select at least one category",
    path: ["categoryIds"],
  });
export type DiscountInput = z.infer<typeof discountSchema>;
