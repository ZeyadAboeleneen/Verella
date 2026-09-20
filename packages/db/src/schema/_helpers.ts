import { sql } from "drizzle-orm";
import { bigint, char, timestamp } from "drizzle-orm/mysql-core";

/** Standard unsigned auto-increment primary key. */
export const id = () =>
  bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

/** Unsigned bigint FK column (nullable by default — call .notNull() at the call site if required). */
export const fk = (name: string) => bigint(name, { mode: "number", unsigned: true });

/**
 * External/public identifier for every business table.
 * Used for POS/offline sync and external references so internal
 * auto-increment ids never leak past the API boundary.
 * Requires MySQL 8.0.13+ for expression column defaults.
 */
export const uuid = () => char("uuid", { length: 36 }).notNull().default(sql`(uuid())`);

export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
};

export const softDelete = {
  deletedAt: timestamp("deleted_at"),
};

/** ISO 639-1 locale code, e.g. "en" | "ar". */
export const locale = (name = "locale") => char(name, { length: 5 }).notNull();
