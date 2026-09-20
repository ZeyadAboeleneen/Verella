import { boolean, char, decimal, index, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { fk, id, timestamps, uuid } from "./_helpers";
import { orders } from "./orders";
import { media } from "./media";
import { users } from "./auth";

/**
 * "code" is the provider-abstraction seam: adding Stripe/Paymob later is a new row here
 * plus a provider adapter in packages/core — no schema change.
 */
export const paymentMethods = mysqlTable("payment_methods", {
  id: id(),
  code: varchar("code", { length: 50 }).notNull().unique(), // cash_on_delivery | instapay | stripe | paymob
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  config: json("config"),
  sortOrder: int("sort_order").notNull().default(0),
});

export type PaymentStatus = "pending" | "submitted" | "approved" | "rejected" | "refunded";

export const payments = mysqlTable(
  "payments",
  {
    id: id(),
    uuid: uuid(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    methodId: fk("method_id")
      .notNull()
      .references(() => paymentMethods.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EGP"),
    status: varchar("status", { length: 20 }).notNull().default("pending").$type<PaymentStatus>(),
    providerRef: varchar("provider_ref", { length: 191 }),
    /** InstaPay screenshot proof; NULL for COD. */
    proofMediaId: fk("proof_media_id").references(() => media.id),
    reviewedBy: fk("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    notes: varchar("notes", { length: 255 }),
    ...timestamps,
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)],
);
