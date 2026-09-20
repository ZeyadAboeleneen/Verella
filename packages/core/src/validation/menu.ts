import { z } from "zod";
import { slugSchema, decimalString, requiredLocalizedText, optionalLocalizedText } from "./shared";

export const menuCategorySchema = z.object({
  slug: slugSchema,
  icon: z.string().max(100).optional(),
  imageMediaId: z.number().int().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  name: requiredLocalizedText(191),
  description: optionalLocalizedText(500),
});
export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;

/** Common size labels offered as quick-picks in the admin form — not an enum, so a product can use any label (e.g. a dessert's "Slice"). */
export const MENU_ITEM_SIZE_OPTIONS = ["Single", "Double", "Medium", "Large"] as const;

export const menuItemSizeSchema = z.object({
  id: z.number().int().positive().optional(),
  size: z.string().min(1, "Size label is required").max(32),
  price: decimalString,
  sortOrder: z.coerce.number().int().default(0),
});
export type MenuItemSizeInput = z.infer<typeof menuItemSizeSchema>;

export const menuItemSchema = z.object({
  categoryId: z.number().int().positive(),
  slug: slugSchema,
  sizes: z.array(menuItemSizeSchema).min(1, "Add at least one size and price"),
  imageMediaId: z.number().int().positive().nullable().optional(),
  badge: z.string().max(50).optional(),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  name: requiredLocalizedText(191),
  description: optionalLocalizedText(500),
  notes: optionalLocalizedText(255),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuHeroImageSchema = z.object({
  mediaId: z.number().int().positive(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type MenuHeroImageInput = z.infer<typeof menuHeroImageSchema>;
