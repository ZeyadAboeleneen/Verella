import {
  boolean,
  char,
  decimal,
  index,
  int,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { fk, id, locale, softDelete, timestamps, uuid } from "./_helpers";
import { media } from "./media";

export const storeCategories = mysqlTable("store_categories", {
  id: id(),
  uuid: uuid(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  imageMediaId: fk("image_media_id").references(() => media.id),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const storeCategoryTranslations = mysqlTable(
  "store_category_translations",
  {
    id: id(),
    categoryId: fk("category_id")
      .notNull()
      .references(() => storeCategories.id, { onDelete: "cascade" }),
    locale: locale(),
    name: varchar("name", { length: 191 }).notNull(),
    description: varchar("description", { length: 500 }),
  },
  (t) => [uniqueIndex("store_category_translations_unique").on(t.categoryId, t.locale)],
);

export const storeProducts = mysqlTable(
  "store_products",
  {
    id: id(),
    uuid: uuid(),
    categoryId: fk("category_id")
      .notNull()
      .references(() => storeCategories.id),
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    sku: varchar("sku", { length: 64 }).unique(),
    /** Brand name as free text — Verella is multi-brand, and this drives catalog filtering. */
    brand: varchar("brand", { length: 120 }),
    /**
     * Base price. Authoritative only for products with no variants; when variants
     * exist it is the "from" price used for listing display.
     */
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EGP"),
    compareAtPrice: decimal("compare_at_price", { precision: 12, scale: 2 }),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    isFeaturedHome: boolean("is_featured_home").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    /** Simple stock count for Phase 1 — decremented on order; full inventory module comes with POS. */
    stockQty: int("stock_qty").notNull().default(0),
    rating: decimal("rating", { precision: 2, scale: 1 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("store_products_category_idx").on(t.categoryId)],
);

/**
 * Extra categories a product also appears in — beyond its primary
 * store_products.category_id (e.g. a musk that is also unisex, a set that is
 * also musk). The primary category is not repeated here.
 */
export const storeProductCategories = mysqlTable(
  "store_product_categories",
  {
    productId: fk("product_id")
      .notNull()
      .references(() => storeProducts.id, { onDelete: "cascade" }),
    categoryId: fk("category_id")
      .notNull()
      .references(() => storeCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("store_product_categories_category_idx").on(t.categoryId)],
);

export const storeProductTranslations = mysqlTable(
  "store_product_translations",
  {
    id: id(),
    productId: fk("product_id")
      .notNull()
      .references(() => storeProducts.id, { onDelete: "cascade" }),
    locale: locale(),
    name: varchar("name", { length: 191 }).notNull(),
    description: varchar("description", { length: 1000 }),
    notes: varchar("notes", { length: 255 }),
  },
  (t) => [uniqueIndex("store_product_translations_unique").on(t.productId, t.locale)],
);

export const storeProductMedia = mysqlTable(
  "store_product_media",
  {
    id: id(),
    productId: fk("product_id")
      .notNull()
      .references(() => storeProducts.id, { onDelete: "cascade" }),
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id),
    sortOrder: int("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [index("store_product_media_product_idx").on(t.productId)],
);

/** What a product's variants vary by — drives the selector's label on the product page. */
export type VariantAxis = "volume" | "size" | "color";

/**
 * A purchasable variation of a product: 50ml vs 100ml, M vs L. Price, stock and
 * SKU live here rather than on the product, so each one sells and depletes
 * independently. A product with no rows here is sold as a single simple item
 * priced off `storeProducts.price`.
 */
export const storeProductVariants = mysqlTable(
  "store_variants",
  {
    id: id(),
    uuid: uuid(),
    productId: fk("product_id")
      .notNull()
      .references(() => storeProducts.id, { onDelete: "cascade" }),
    axis: varchar("axis", { length: 16 }).notNull().default("volume").$type<VariantAxis>(),
    /** Shown as-is when a locale has no translation row — fine for "50ml", not for "Small". */
    label: varchar("label", { length: 64 }).notNull(),
    sku: varchar("sku", { length: 64 }).unique(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 12, scale: 2 }),
    stockQty: int("stock_qty").notNull().default(0),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("store_variants_product_idx").on(t.productId)],
);

export const storeProductVariantTranslations = mysqlTable(
  "store_variant_translations",
  {
    id: id(),
    variantId: fk("variant_id")
      .notNull()
      .references(() => storeProductVariants.id, { onDelete: "cascade" }),
    locale: locale(),
    label: varchar("label", { length: 64 }).notNull(),
  },
  (t) => [uniqueIndex("store_variant_translations_unique").on(t.variantId, t.locale)],
);
