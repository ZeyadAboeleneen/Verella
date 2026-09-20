import { char, decimal, index, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { fk, id, softDelete, timestamps, uuid } from "./_helpers";
import { branches } from "./branches";
import { users } from "./auth";
import { customers, addresses } from "./customers";
import { storeProducts } from "./store";
import { discounts } from "./promotions";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";
export type OrderChannel = "web" | "pos" | "app";
export type FulfillmentType = "delivery" | "pickup";

export const orders = mysqlTable(
  "orders",
  {
    id: id(),
    uuid: uuid(),
    orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
    customerId: fk("customer_id").references(() => customers.id),
    /** { name, email, phone } snapshot for guest checkout. */
    guestContact: json("guest_contact"),
    branchId: fk("branch_id").references(() => branches.id),
    channel: varchar("channel", { length: 20 }).notNull().default("web").$type<OrderChannel>(),
    status: varchar("status", { length: 30 }).notNull().default("pending").$type<OrderStatus>(),
    fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull().$type<FulfillmentType>(),
    addressId: fk("address_id").references(() => addresses.id),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    discountTotal: decimal("discount_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
    taxTotal: decimal("tax_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
    deliveryFee: decimal("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
    grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EGP"),
    placedAt: timestamp("placed_at").notNull().defaultNow(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("orders_customer_idx").on(t.customerId),
    index("orders_status_idx").on(t.status),
    index("orders_branch_idx").on(t.branchId),
  ],
);

/** Snapshots name/sku/price at purchase time — catalog edits never alter historical orders. */
export const orderItems = mysqlTable(
  "order_items",
  {
    id: id(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeProductId: fk("store_product_id").references(() => storeProducts.id, { onDelete: "set null" }),
    nameSnapshot: varchar("name_snapshot", { length: 191 }).notNull(),
    skuSnapshot: varchar("sku_snapshot", { length: 64 }),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: int("quantity").notNull(),
    lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
    options: json("options"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderStatusHistory = mysqlTable(
  "order_status_history",
  {
    id: id(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull(),
    note: varchar("note", { length: 255 }),
    changedBy: fk("changed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

export const orderDiscounts = mysqlTable("order_discounts", {
  id: id(),
  orderId: fk("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  discountId: fk("discount_id").references(() => discounts.id, { onDelete: "set null" }),
  code: varchar("code", { length: 50 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const discountRedemptions = mysqlTable("discount_redemptions", {
  id: id(),
  discountId: fk("discount_id")
    .notNull()
    .references(() => discounts.id, { onDelete: "cascade" }),
  orderId: fk("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  userId: fk("user_id").references(() => users.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
