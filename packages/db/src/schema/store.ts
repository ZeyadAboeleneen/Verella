import {
  boolean,
  char,
  decimal,
  index,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { fk, id, locale, softDelete, timestamps, uuid } from "./_helpers";
import { media } from "./media";

export const storeHeroImages = mysqlTable("store_hero_images", {
  id: id(),
  uuid: uuid(),
  mediaId: fk("media_id")
    .notNull()
    .references(() => media.id),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** Separate from the Menu module by design (Phase 1 decision) — the e-commerce catalog. */
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
