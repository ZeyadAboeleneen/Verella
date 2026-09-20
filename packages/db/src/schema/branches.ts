import { boolean, char, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { id, timestamps, uuid } from "./_helpers";

/**
 * Reserved for multi-branch/POS. Seeded with a single branch for Phase 1,
 * but every operational table already carries branch_id so multi-branch
 * never requires a schema migration later.
 */
export const branches = mysqlTable("branches", {
  id: id(),
  uuid: uuid(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  mapUrl: varchar("map_url", { length: 512 }),
  hours: varchar("hours", { length: 191 }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Cairo"),
  currency: char("currency", { length: 3 }).notNull().default("EGP"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * Display-only branch listing for the public /branches page, managed from
 * Admin → Branches. Deliberately standalone: it has NO relationship to orders,
 * carts, products, menus, or the operational `branches` table above. It exists
 * purely so an admin can edit the branch info customers see, so rows here are
 * always safe to add, edit, and delete.
 */
export const branchLocations = mysqlTable("branch_locations", {
  id: id(),
  name: varchar("name", { length: 191 }).notNull(),
  nameAr: varchar("name_ar", { length: 191 }),
  address: varchar("address", { length: 255 }),
  addressAr: varchar("address_ar", { length: 255 }),
  hours: varchar("hours", { length: 191 }),
  mapUrl: varchar("map_url", { length: 512 }),
  ...timestamps,
});
