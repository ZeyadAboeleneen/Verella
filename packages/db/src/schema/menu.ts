import { boolean, char, decimal, index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { fk, id, locale, softDelete, timestamps, uuid } from "./_helpers";
import { media } from "./media";

/**
 * Display-only digital menu (Phase 1: no cart/checkout for menu items —
 * ordering is a Store-module concern; POS will order menu items directly later).
 */
export const menuHeroImages = mysqlTable("menu_hero_images", {
  id: id(),
  uuid: uuid(),
  mediaId: fk("media_id")
    .notNull()
    .references(() => media.id),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const menuCategories = mysqlTable("menu_categories", {
  id: id(),
  uuid: uuid(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  icon: varchar("icon", { length: 100 }),
  imageMediaId: fk("image_media_id").references(() => media.id),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const menuCategoryTranslations = mysqlTable(
  "menu_category_translations",
  {
    id: id(),
    categoryId: fk("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "cascade" }),
    locale: locale(),
    name: varchar("name", { length: 191 }).notNull(),
    description: varchar("description", { length: 500 }),
  },
  (t) => [uniqueIndex("menu_category_translations_unique").on(t.categoryId, t.locale)],
);

export const menuItems = mysqlTable(
  "menu_items",
  {
    id: id(),
    uuid: uuid(),
    categoryId: fk("category_id")
      .notNull()
      .references(() => menuCategories.id),
    slug: varchar("slug", { length: 150 }).notNull().unique(),
    // Deprecated: pricing now lives in menuItemSizes (a product can have
    // multiple size/price pairs). Kept nullable for backward compatibility
    // with any external reads — the app no longer writes to it.
    price: decimal("price", { precision: 12, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("EGP"),
    imageMediaId: fk("image_media_id").references(() => media.id),
    badge: varchar("badge", { length: 50 }), // e.g. "Popular" | "Heritage" | "Seasonal"
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("menu_items_category_idx").on(t.categoryId)],
);

export const menuItemTranslations = mysqlTable(
  "menu_item_translations",
  {
    id: id(),
    itemId: fk("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    locale: locale(),
    name: varchar("name", { length: 191 }).notNull(),
    description: varchar("description", { length: 500 }),
    notes: varchar("notes", { length: 255 }),
  },
  (t) => [uniqueIndex("menu_item_translations_unique").on(t.itemId, t.locale)],
);

/**
 * A menu item can have one or more sizes (Single/Double/Medium/Large, or a
 * free-text label for items that don't fit those — e.g. a dessert slice),
 * each with its own price. `size` is a free varchar rather than a DB enum so
 * new labels never require a migration.
 */
export const menuItemSizes = mysqlTable(
  "menu_item_sizes",
  {
    id: id(),
    itemId: fk("item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    size: varchar("size", { length: 32 }).notNull(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("menu_item_sizes_item_idx").on(t.itemId)],
);
