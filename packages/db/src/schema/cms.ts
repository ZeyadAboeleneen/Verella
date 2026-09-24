import { json, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { id, timestamps } from "./_helpers";

/** Site-wide config: name, default_locale, currency, tax toggles, payment method toggles, etc. */
export const settings = mysqlTable(
  "settings",
  {
    id: id(),
    group: varchar("group", { length: 50 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: json("value").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("settings_group_key_unique").on(t.group, t.key)],
);
