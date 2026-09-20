import { char, decimal, index, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { fk, id, timestamps, uuid } from "./_helpers";
import { branches } from "./branches";
import { users } from "./auth";
import { storeProducts } from "./store";

export type CartStatus = "active" | "converted" | "abandoned";

/** Guest carts (userId NULL) key off guestToken; merged into the user's cart on login/registration. */
export const carts = mysqlTable(
  "carts",
  {
    id: id(),
    uuid: uuid(),
    userId: fk("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestToken: varchar("guest_token", { length: 64 }),
    branchId: fk("branch_id").references(() => branches.id),
    currency: char("currency", { length: 3 }).notNull().default("EGP"),
    status: varchar("status", { length: 20 }).notNull().default("active").$type<CartStatus>(),
    expiresAt: timestamp("expires_at"),
    ...timestamps,
  },
  (t) => [index("carts_user_idx").on(t.userId), index("carts_guest_idx").on(t.guestToken)],
);

export const cartItems = mysqlTable(
  "cart_items",
  {
    id: id(),
    cartId: fk("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    storeProductId: fk("store_product_id")
      .notNull()
      .references(() => storeProducts.id),
    quantity: int("quantity").notNull().default(1),
    unitPriceSnapshot: decimal("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
    notes: varchar("notes", { length: 255 }),
    options: json("options"),
    ...timestamps,
  },
  (t) => [index("cart_items_cart_idx").on(t.cartId)],
);
