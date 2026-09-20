import { boolean, decimal, int, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core";
import { fk, id, timestamps, uuid } from "./_helpers";
import { branches } from "./branches";
import { storeCategories, storeProducts } from "./store";

export type DiscountType = "percent" | "fixed";
export type DiscountScope = "all" | "category" | "product";

export const discounts = mysqlTable("discounts", {
  id: id(),
  uuid: uuid(),
  name: varchar("name", { length: 191 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().$type<DiscountType>(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  scope: varchar("scope", { length: 20 }).notNull().$type<DiscountScope>(),
  code: varchar("code", { length: 50 }).unique(),
  minOrderTotal: decimal("min_order_total", { precision: 12, scale: 2 }),
  maxUses: int("max_uses"),
  perUserLimit: int("per_user_limit"),
  usedCount: int("used_count").notNull().default(0),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  branchId: fk("branch_id").references(() => branches.id),
  ...timestamps,
});

export const discountProducts = mysqlTable(
  "discount_products",
  {
    discountId: fk("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    storeProductId: fk("store_product_id")
      .notNull()
      .references(() => storeProducts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.discountId, t.storeProductId] })],
);

export const discountCategories = mysqlTable(
  "discount_categories",
  {
    discountId: fk("discount_id")
      .notNull()
      .references(() => discounts.id, { onDelete: "cascade" }),
    storeCategoryId: fk("store_category_id")
      .notNull()
      .references(() => storeCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.discountId, t.storeCategoryId] })],
);
