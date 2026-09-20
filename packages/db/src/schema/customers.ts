import { boolean, decimal, index, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { fk, id, timestamps, uuid } from "./_helpers";
import { users } from "./auth";

export const customers = mysqlTable("customers", {
  id: id(),
  uuid: uuid(),
  userId: fk("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  loyaltyPoints: int("loyalty_points").notNull().default(0),
  notes: varchar("notes", { length: 500 }),
  ...timestamps,
});

/** Guest addresses attach via guestToken and are re-parented to customerId on account creation. */
export const addresses = mysqlTable(
  "addresses",
  {
    id: id(),
    uuid: uuid(),
    customerId: fk("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    guestToken: varchar("guest_token", { length: 64 }),
    label: varchar("label", { length: 100 }),
    recipientName: varchar("recipient_name", { length: 191 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    governorate: varchar("governorate", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }),
    area: varchar("area", { length: 100 }),
    street: varchar("street", { length: 255 }).notNull(),
    building: varchar("building", { length: 50 }),
    floor: varchar("floor", { length: 20 }),
    apartment: varchar("apartment", { length: 20 }),
    landmark: varchar("landmark", { length: 255 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("addresses_customer_idx").on(t.customerId),
    index("addresses_guest_idx").on(t.guestToken),
  ],
);
