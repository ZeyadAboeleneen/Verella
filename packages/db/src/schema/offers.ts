import { boolean, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { fk, id, timestamps } from "./_helpers";
import { media } from "./media";

/**
 * Marketing offers / announcements managed in Admin → Offers. Each one can
 * show in the site-wide announcement bar, in the home-page offers section, or
 * both. Shown only while active and inside its (optional) date window.
 */
export const offers = mysqlTable("offers", {
  id: id(),
  titleAr: varchar("title_ar", { length: 160 }).notNull(),
  titleEn: varchar("title_en", { length: 160 }).notNull(),
  bodyAr: text("body_ar"),
  bodyEn: text("body_en"),
  /** Short eye-catcher on the card, e.g. "−30%" or "Free delivery". */
  highlightAr: varchar("highlight_ar", { length: 40 }),
  highlightEn: varchar("highlight_en", { length: 40 }),
  ctaLabelAr: varchar("cta_label_ar", { length: 60 }),
  ctaLabelEn: varchar("cta_label_en", { length: 60 }),
  /** Site path ("/store?category=musk") or full URL. */
  linkUrl: varchar("link_url", { length: 500 }),
  /** Discount code customers can copy. */
  code: varchar("code", { length: 50 }),
  imageMediaId: fk("image_media_id").references(() => media.id, { onDelete: "set null" }),
  showInBar: boolean("show_in_bar").notNull().default(true),
  showInCards: boolean("show_in_cards").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
});
