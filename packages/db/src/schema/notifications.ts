import { int, index, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { fk, id, timestamps } from "./_helpers";
import { orders, type OrderStatus } from "./orders";

export type NotificationChannel = "whatsapp" | "email";
/**
 * "invoice" once per order, one "status_<status>" message per status reached,
 * and one "admin_new_order" alert to the store's own number.
 */
export type NotificationKind = "invoice" | `status_${OrderStatus}` | "admin_new_order" | "deposit_request" | "deposit_refund";
/**
 * sending — claimed by one worker, send in flight
 * sent    — delivered to the gateway; never sent again
 * failed  — last attempt failed; the next lifecycle event may retry it
 */
export type NotificationStatus = "sending" | "sent" | "failed";

/**
 * One row per (order, channel, kind) — the unique key is what guarantees an
 * automatic message goes out at most once, even under concurrent triggers
 * (duplicate submits, repeated admin actions, retries).
 */
export const orderNotifications = mysqlTable(
  "order_notifications",
  {
    id: id(),
    orderId: fk("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 20 }).notNull().$type<NotificationChannel>(),
    kind: varchar("kind", { length: 30 }).notNull().$type<NotificationKind>(),
    status: varchar("status", { length: 20 }).notNull().$type<NotificationStatus>(),
    /** Where it was sent (WhatsApp jid) — the address actually used, for auditing. */
    recipient: varchar("recipient", { length: 64 }),
    /** Provider message id returned by the gateway (Baileys message key id). */
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    attempts: int("attempts").notNull().default(1),
    lastError: varchar("last_error", { length: 255 }),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("order_notifications_order_channel_kind_unique").on(t.orderId, t.channel, t.kind),
    index("order_notifications_status_idx").on(t.status),
  ],
);
