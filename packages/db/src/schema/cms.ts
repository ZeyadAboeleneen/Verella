import { boolean, index, int, json, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { fk, id, locale, timestamps, uuid } from "./_helpers";
import { media } from "./media";

/**
 * Flexible home-page / marketing content. `payload` is locale-keyed JSON,
 * e.g. { en: { heading, body, ctaLabel }, ar: { ... } }, so new block types
 * never require a migration.
 */
export const contentBlocks = mysqlTable(
  "content_blocks",
  {
    id: id(),
    uuid: uuid(),
    page: varchar("page", { length: 50 }).notNull(), // "home" | "about" | ...
    blockKey: varchar("block_key", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // "hero" | "featured_products" | "promo_banner" | ...
    payload: json("payload").notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("content_blocks_page_idx").on(t.page),
    uniqueIndex("content_blocks_page_key_unique").on(t.page, t.blockKey),
  ],
);

export const banners = mysqlTable("banners", {
  id: id(),
  uuid: uuid(),
  mediaId: fk("media_id")
    .notNull()
    .references(() => media.id),
  /** Button 1 destination. */
  linkUrl: varchar("link_url", { length: 512 }),
  /** Button 2 destination — a slide can offer up to two CTAs. */
  link2Url: varchar("link2_url", { length: 512 }),
  /** Makes the slide image itself clickable (independent of the buttons). */
  imageLinkUrl: varchar("image_link_url", { length: 512 }),
  placement: varchar("placement", { length: 50 }).notNull(), // "home_top" | "store_top" | ...
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const bannerTranslations = mysqlTable(
  "banner_translations",
  {
    id: id(),
    bannerId: fk("banner_id")
      .notNull()
      .references(() => banners.id, { onDelete: "cascade" }),
    locale: locale(),
    title: varchar("title", { length: 191 }),
    subtitle: varchar("subtitle", { length: 255 }),
    ctaText: varchar("cta_text", { length: 100 }),
    ctaText2: varchar("cta_text_2", { length: 100 }),
  },
  (t) => [uniqueIndex("banner_translations_unique").on(t.bannerId, t.locale)],
);

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
