import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PERMISSION_SLUGS, ROLE_DEFINITIONS, permissionGroup } from "@verella/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Produces a single importable .sql file (CREATE DATABASE + all 39 tables +
 * seed data) for people who want to hand this to MySQL Workbench/phpMyAdmin
 * instead of running `pnpm db:migrate && pnpm db:seed`. Mirrors seed.ts's
 * data exactly — reuses the same PERMISSION_SLUGS/ROLE_DEFINITIONS source of
 * truth and copies its literal catalog data, so the two can never drift.
 *
 * Regenerate after any schema or seed-data change: pnpm db:dump
 */

const DB_NAME = "verella";
const OUT_PATH = path.resolve(__dirname, "../../../database/verella.sql");
const MIGRATIONS_DIR = path.resolve(__dirname, "../drizzle");
// All migration files in order (0000, 0001, ...) — not just the first one,
// so this dump always reflects the current schema as new migrations land.
const MIGRATION_PATHS = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => path.join(MIGRATIONS_DIR, f));

function esc(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function str(v: string | null | undefined): string {
  return v === null || v === undefined ? "NULL" : `'${esc(v)}'`;
}
function bool(v: boolean): string {
  return v ? "1" : "0";
}
function json(v: unknown): string {
  return `'${esc(JSON.stringify(v))}'`;
}
function col(name: string): string {
  return `\`${name}\``;
}

const out: string[] = [];
const line = (s = "") => out.push(s);
const rowCounts: Record<string, number> = {};

line("-- ============================================================================");
line("-- Verella — full database (schema + seed data)");
line(`-- Generated ${new Date().toISOString()} by packages/db/src/generate-sql-dump.ts`);
line("-- Source of truth: packages/db/src/schema/*.ts (Drizzle) + packages/db/src/seed.ts");
line("-- Regenerate with: pnpm db:dump");
line("--");
line("-- Import with MySQL Workbench (Server > Data Import > Import from Self-Contained File)");
line("-- or phpMyAdmin (Import tab), or from a terminal:");
line(`--   mysql -u root -p < verella.sql`);
line("-- ============================================================================");
line();
line(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
line(`USE \`${DB_NAME}\`;`);
line();
line("SET NAMES utf8mb4;");
line("SET FOREIGN_KEY_CHECKS = 0;");
line();

// ---- schema: reuse the drizzle-kit-generated migrations verbatim, in order ----
const migrationSql = MIGRATION_PATHS.map((p) => fs.readFileSync(p, "utf8")).join("\n");
// drizzle-kit's breakpoint marker appears both on its own line and appended
// directly after a statement's `;` on the same line (e.g. in the FK/ALTER
// TABLE block) — a line-start filter misses the latter, so replace globally.
// "-->" is not a valid MySQL comment (needs "-- " with a space), so any
// leftover marker would break import.
const cleanedSchema = migrationSql
  .split("--> statement-breakpoint")
  .join("")
  .split("\n")
  .filter((l) => l.trim().length > 0)
  .join("\n")
  .trim();
const tableCount = (cleanedSchema.match(/^CREATE TABLE/gm) ?? []).length;

line("-- ============================================================================");
line(`-- SCHEMA (${tableCount} tables)`);
line("-- ============================================================================");
line(cleanedSchema);
line();

// ---- seed data ----
line("-- ============================================================================");
line("-- SEED DATA");
line("-- ============================================================================");
line();

// branches
line("-- branches");
line(`INSERT INTO ${col("branches")} (${col("id")}, ${col("code")}, ${col("name")}, ${col("currency")}) VALUES`);
line(`(1, ${str("MAIN")}, ${str("Hamid Afandi — Main Branch")}, ${str("EGP")});`);
line();
rowCounts.branches = 1;

// permissions
line("-- permissions");
const permRows = PERMISSION_SLUGS.map((slug, i) => `(${i + 1}, ${str(slug)}, ${str(permissionGroup(slug))})`);
line(`INSERT INTO ${col("permissions")} (${col("id")}, ${col("slug")}, ${col("group")}) VALUES`);
line(permRows.join(",\n") + ";");
line();
rowCounts.permissions = permRows.length;
const permIdBySlug = new Map(PERMISSION_SLUGS.map((slug, i) => [slug as string, i + 1]));

// roles
line("-- roles");
const roleRows = ROLE_DEFINITIONS.map((r, i) => `(${i + 1}, ${str(r.name)}, ${str(r.slug)}, ${bool(r.isSystem)})`);
line(`INSERT INTO ${col("roles")} (${col("id")}, ${col("name")}, ${col("slug")}, ${col("is_system")}) VALUES`);
line(roleRows.join(",\n") + ";");
line();
rowCounts.roles = roleRows.length;
const roleIdBySlug = new Map(ROLE_DEFINITIONS.map((r, i) => [r.slug as string, i + 1]));

// role_permissions
line("-- role_permissions");
const rolePermRows: string[] = [];
for (const r of ROLE_DEFINITIONS) {
  const roleId = roleIdBySlug.get(r.slug)!;
  for (const slug of r.permissions) rolePermRows.push(`(${roleId}, ${permIdBySlug.get(slug)!})`);
}
line(`INSERT INTO ${col("role_permissions")} (${col("role_id")}, ${col("permission_id")}) VALUES`);
line(rolePermRows.join(",\n") + ";");
line();
rowCounts.role_permissions = rolePermRows.length;

// users (super admin)
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "hanarabeea707@gmail.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const passwordHash = bcrypt.hashSync(adminPassword, 12);
line("-- users (seeded Super Admin — CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN)");
line(
  `INSERT INTO ${col("users")} (${col("id")}, ${col("email")}, ${col("full_name")}, ${col("password_hash")}, ${col("status")}, ${col("email_verified_at")}) VALUES`,
);
line(`(1, ${str(adminEmail)}, ${str("Hamid Afandi Admin")}, ${str(passwordHash)}, ${str("active")}, NOW());`);
line();
rowCounts.users = 1;

// user_roles
line("-- user_roles");
line(`INSERT INTO ${col("user_roles")} (${col("id")}, ${col("user_id")}, ${col("role_id")}) VALUES`);
line(`(1, 1, ${roleIdBySlug.get("super_admin")});`);
line();
rowCounts.user_roles = 1;

// payment_methods
line("-- payment_methods");
line(
  `INSERT INTO ${col("payment_methods")} (${col("id")}, ${col("code")}, ${col("name")}, ${col("is_active")}, ${col("sort_order")}) VALUES`,
);
line(`(1, ${str("cash_on_delivery")}, ${str("Cash on Delivery")}, 1, 1),`);
line(`(2, ${str("instapay")}, ${str("InstaPay")}, 1, 2);`);
line();
rowCounts.payment_methods = 2;

// settings
const settingsData: { group: string; key: string; value: unknown }[] = [
  { group: "site", key: "name", value: { en: "Hamid Afandi", ar: "حامد أفندي" } },
  { group: "site", key: "default_locale", value: "en" },
  { group: "site", key: "supported_locales", value: ["en", "ar"] },
  { group: "site", key: "currency", value: "EGP" },
  { group: "checkout", key: "tax_enabled", value: false },
  { group: "checkout", key: "fulfillment_types", value: ["delivery", "pickup"] },
  { group: "checkout", key: "guest_checkout_enabled", value: true },
  { group: "checkout", key: "delivery_fee", value: "30.00" },
];
line("-- settings");
line(`INSERT INTO ${col("settings")} (${col("id")}, ${col("group")}, ${col("key")}, ${col("value")}) VALUES`);
line(settingsData.map((s, i) => `(${i + 1}, ${str(s.group)}, ${str(s.key)}, ${json(s.value)})`).join(",\n") + ";");
line();
rowCounts.settings = settingsData.length;

import { menuCategoryDefs } from "./menu-catalog";

// ── Menu catalog (identical literal data to seed.ts) ──────────────────────
line("-- menu category images / menu_categories / menu_category_translations / menu_items / menu_item_translations / menu_item_sizes");
const menuCatImageRows: string[] = [];
const menuCatRows: string[] = [];
const menuCatTransRows: string[] = [];
const menuItemRows: string[] = [];
const menuItemTransRows: string[] = [];
const menuItemSizeRows: string[] = [];
let menuCatId = 0;
let menuItemId = 0;
let menuSort = 0;
// Category image media ids start at 101 — well clear of the store-product
// media block (ids 1-8, inserted later below) so the two ranges never collide.
const MENU_CATEGORY_MEDIA_ID_BASE = 100;
for (const cat of menuCategoryDefs) {
  menuCatId++;
  const catMediaId = MENU_CATEGORY_MEDIA_ID_BASE + menuCatId;
  menuCatImageRows.push(
    `(${catMediaId}, ${str("external")}, ${str("")}, ${str(cat.image)}, ${str(cat.image)}, ${str("image/jpeg")}, ${str(cat.imageAlt)}, ${str("menu-categories")})`,
  );
  menuCatRows.push(`(${menuCatId}, ${str(cat.slug)}, ${str(cat.icon)}, ${catMediaId}, ${menuSort++}, 1)`);
  menuCatTransRows.push(`(${menuCatId}, ${str("en")}, ${str(cat.nameEn)})`);
  menuCatTransRows.push(`(${menuCatId}, ${str("ar")}, ${str(cat.nameAr)})`);

  let itemSort = 0;
  for (const item of cat.items) {
    menuItemId++;
    menuItemRows.push(
      `(${menuItemId}, ${menuCatId}, ${str(item.slug)}, ${str("EGP")}, ${str(item.badge)}, ${bool(item.badge === "New")}, ${itemSort++}, 1)`,
    );
    menuItemTransRows.push(`(${menuItemId}, ${str("en")}, ${str(item.nameEn)}, ${str(item.descEn)})`);
    menuItemTransRows.push(`(${menuItemId}, ${str("ar")}, ${str(item.nameAr)}, ${str(item.descAr)})`);
    
    if (item.sizes && item.sizes.length > 0) {
      let szSort = 0;
      for (const s of item.sizes) {
        menuItemSizeRows.push(`(${menuItemId}, ${str(s.sizeEn)}, ${str(s.price)}, ${szSort++})`);
      }
    } else {
      menuItemSizeRows.push(`(${menuItemId}, ${str("Regular")}, ${str(item.price)}, 0)`);
    }
  }
}
line(`INSERT INTO ${col("media")} (${col("id")}, ${col("disk")}, ${col("bucket")}, ${col("object_key")}, ${col("url")}, ${col("mime")}, ${col("alt")}, ${col("folder")}) VALUES`);
line(menuCatImageRows.join(",\n") + ";");
line(`INSERT INTO ${col("menu_categories")} (${col("id")}, ${col("slug")}, ${col("icon")}, ${col("image_media_id")}, ${col("sort_order")}, ${col("is_active")}) VALUES`);
line(menuCatRows.join(",\n") + ";");
line(`INSERT INTO ${col("menu_category_translations")} (${col("category_id")}, ${col("locale")}, ${col("name")}) VALUES`);
line(menuCatTransRows.join(",\n") + ";");
line(
  `INSERT INTO ${col("menu_items")} (${col("id")}, ${col("category_id")}, ${col("slug")}, ${col("currency")}, ${col("badge")}, ${col("is_new")}, ${col("sort_order")}, ${col("is_active")}) VALUES`,
);
line(menuItemRows.join(",\n") + ";");
line(`INSERT INTO ${col("menu_item_translations")} (${col("item_id")}, ${col("locale")}, ${col("name")}, ${col("description")}) VALUES`);
line(menuItemTransRows.join(",\n") + ";");
line(`INSERT INTO ${col("menu_item_sizes")} (${col("item_id")}, ${col("size")}, ${col("price")}, ${col("sort_order")}) VALUES`);
line(menuItemSizeRows.join(",\n") + ";");
line();
rowCounts.media = (rowCounts.media ?? 0) + menuCatImageRows.length;
rowCounts.menu_categories = menuCatRows.length;
rowCounts.menu_category_translations = menuCatTransRows.length;
rowCounts.menu_items = menuItemRows.length;
rowCounts.menu_item_translations = menuItemTransRows.length;
rowCounts.menu_item_sizes = menuItemSizeRows.length;

// ── Store catalog (identical literal data to seed.ts) ─────────────────────
const storeCategoryDefs: { slug: string; nameEn: string; nameAr: string }[] = [
  { slug: "beans", nameEn: "Coffee Beans", nameAr: "حبوب القهوة" },
  { slug: "turkish", nameEn: "Turkish Coffee", nameAr: "قهوة تركي" },
  { slug: "espresso", nameEn: "Espresso", nameAr: "إسبريسو" },
  { slug: "accessories", nameEn: "Accessories", nameAr: "إكسسوارات" },
  { slug: "gifts", nameEn: "Gifts", nameAr: "هدايا" },
];
const storeCategoryIdBySlug = new Map<string, number>();
line("-- store_categories / store_category_translations");
const storeCatRows: string[] = [];
const storeCatTransRows: string[] = [];
let storeCatId = 0;
let storeCatSort = 0;
for (const cat of storeCategoryDefs) {
  storeCatId++;
  storeCategoryIdBySlug.set(cat.slug, storeCatId);
  storeCatRows.push(`(${storeCatId}, ${str(cat.slug)}, ${storeCatSort++}, 1)`);
  storeCatTransRows.push(`(${storeCatId}, ${str("en")}, ${str(cat.nameEn)})`);
  storeCatTransRows.push(`(${storeCatId}, ${str("ar")}, ${str(cat.nameAr)})`);
}
line(`INSERT INTO ${col("store_categories")} (${col("id")}, ${col("slug")}, ${col("sort_order")}, ${col("is_active")}) VALUES`);
line(storeCatRows.join(",\n") + ";");
line(`INSERT INTO ${col("store_category_translations")} (${col("category_id")}, ${col("locale")}, ${col("name")}) VALUES`);
line(storeCatTransRows.join(",\n") + ";");
line();
rowCounts.store_categories = storeCatRows.length;
rowCounts.store_category_translations = storeCatTransRows.length;

const productDefs: {
  slug: string; nameEn: string; descEn: string; price: string; category: string;
  isBestSeller?: boolean; rating: string; imageUrl: string;
}[] = [
  { slug: "afandi-signature", nameEn: "Afandi Signature Blend", descEn: "Our flagship blend combining Ethiopian and Brazilian origins for a balanced, complex cup.", price: "245.00", category: "beans", isBestSeller: true, rating: "4.9", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAO3qDKQXh0zthabZhGghK70edShq3haEB1h7sRkctfUAUvCktpsQhD3od5976WV88c4RPNCIDUVXOiNGXtpupKNllLKdSxlA8U9NOZFVfGgfmrAubD3XVJx_WSeVw0oYszK-zZf8iJchMGQbziszcEzDxqeQ_hZKNQHlKu47tQPUFCAtCW0LkteupjF2PbRAvQSZPaP-4GP9ycLWUchY0LnUTMvXfNBq2s9LydUn-dzpdGPRA3yhlkMsZqL5rVMHl8aGGfdsUrcS22" },
  { slug: "classic-espresso", nameEn: "Classic Espresso", descEn: "Dark, rich and intensely aromatic. Perfect for those who love a strong, traditional cup.", price: "220.00", category: "espresso", rating: "4.8", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEcBBEWYoqKB1g9SMRo-PBOPa4ygrijePGjVQHlqBLsct3adHO8IXO36ofvFEDaYptN7N_nUVhsv9dIOJZkUagHWR4OR3zJLKQBJE-tZfVIkVAHo3W6c3ufPAdFDUDOTiErcfancpKo0w_oQ_JaY_RZ7LuItoW1_l8uF2j4U6p5BO1Nl1GEPHhoRpLr0eUY-w_vBt5gVlLzFmeUixkO0jQh8-url9VXwC2ivbJxKe-oeCPcnfgvTAph2dfF3TEUloq7XEpwtU33MXX" },
  { slug: "ethiopian-yirgacheffe", nameEn: "Ethiopian Yirgacheffe", descEn: "Bright floral notes with a sparkling citrus acidity. Our most awarded single-origin.", price: "310.00", category: "beans", rating: "5.0", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCualFC7dUe4fOId29Fhv_WOObJt0A0oK4dwRpn-miWXPj9eq2pN5xoRpA3_l8SvX2KiLC2oSLHa9mLVO8JFPnrNvLqpoyKXKwPlY3kzuo1pW_LU_MtKNqaMDaqv4jQIuMCVBXgJzOthU0iAZqaYd29ZX1T2AbI0R1MFtRDBDtjn9K9P1soMoM4lYjmzBWUIJgd7vg6f6AVYSTbNlJNQPKBR2qMIx_OukUTSAbFAvIobhWHeAMXTrwaRCMz33szsIvdFsR1-7qmOzMN" },
  { slug: "heritage-grinder", nameEn: "Heritage Grinder", descEn: "Handcrafted copper grinder inspired by traditional Egyptian artisanship.", price: "850.00", category: "accessories", rating: "4.7", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB6dc5BR6VAl7cRiDRIVM4pSIIHTpg7b8RYXS20ztWO_P3OtC7qUGMd2V44NTMx0-P_m5nwIlykrzwYWJIXFu-4CrDblVg_UNuj1scSDJJwyOVnzCvlUUgLX8Ad01aQ9K6_ZWoj1jCsFNAjCc4XOyrsmkGQtlpJsGG4y4IzUMVGtUokfkDCfejKTmHyZ9dxKFbAdA-Qr4PtqIJCv6c3AmvKjwQY22Nsv4AoFIaZqNd38OjoNUguOpaUSsQQS19Ap0Bvg1gBqL-UzAFDw" },
  { slug: "egyptian-gold", nameEn: "Egyptian Gold", descEn: "A bold, full-bodied blend with notes of dark chocolate and toasted nuts.", price: "280.00", category: "beans", rating: "4.9", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAzN0zQkS5k6B5_NdqcqnANAwA8Y4RujmzrSXJU2qOs0xAtV3EDM2Tf9LP8I7Jp0wV7ctqaTj5CB-dde9VsbPwyL-G9rrPab0Qi77-GVHdHSBrna-hUWNBuPucsdsFNJ_DlrDpEgx7F6xuOrFVN32rregDfUJgArLth4wZTH_GpF21o-5Ia3moH7M0pMGa0nkbSAphkneHNL_7TaiEMJdlJ6nczuibk6tjTg_gwwSYa2_gl3kz2EkMlaD6QmL7tARExqV9FhHuI2thQ" },
  { slug: "cold-brew-blend", nameEn: "Cold Brew Blend", descEn: "Specifically crafted for long cold steeping. Smooth, sweet and incredibly refreshing.", price: "195.00", category: "beans", rating: "4.6", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBS_ICspq4E8s6psEzyun_WxdifdjFBoli9O5c9s65tenx-EJePiAHZ8apiZJNvUde2VHV7fWdc_ZiOqgesJjTGkF-VZ5fHhP3w5DcL_6hg2EdM4vb6opWU1nX5MuQY4QPhEpMP2t5cJwJFf2SPmjT8tVuTH285hiKDebeWo6gHn0o_n2QsAjnOAmKKpnI9CEC4PrlRPKhlfd4kjlF4uhvvXYcedrIkfnDKScVGCqfnqR0TNlLarQ_IgwPXD_AOJ2vEMbElf0Nd6DUY" },
  { slug: "modern-glass-set", nameEn: "Modern Glass Set", descEn: "Elegant double-walled glass cups that keep your espresso hot while staying cool to touch.", price: "450.00", category: "accessories", rating: "4.8", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCiUxYdYPBdh0V9WNd34EKGHQKGAdMdwOK0b1nO8dC7w0xfwmwoHOnWnMl2D-0OZoPzUPVLSCIWOqLibvlcA2hDq3ApPszTDhICfJqwJAsU2M-CRsxlpltdXp4XDu1huzt55NEQH_wEtLSXoIrqUhuoKvdKG9gK9mJcs-g5wSMrNPAoVrI7sJSV7588q8jxmX42Tf3SWjxGdWWYEQABrPN0OxUDNxR5I754ANF9AMHcYVZbbFZKk9huvsEQnpVAUxYeZJL66mgF2mVu" },
  { slug: "cairo-roast", nameEn: "Cairo Roast", descEn: "Smoky, intense and deeply satisfying. The authentic taste of a Cairo evening.", price: "260.00", category: "beans", rating: "4.7", imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ44YoDFCzS8xWko-C-YzrXd-o0wxnIxuPz-P_hqSda3BGfGGtL-6xry2vdVNByVllb2nsrww4TzcTmCHsNoiLxMi7o9Y8uB6184XU6TeOVaqOvMQYopWohq7zVA8n135XHAEfBTBjVYKndkSNl8xji6rALRinv0QNV7-VugHHsbqs-Ik_TqNrmLIOQFZwLSMeyRgUz6KggSbPexlP3Mcg1P9jNTdLC3EJqjssrYbdL34TFQA39EPUUrVgQH1u-seU444WJ5wvXjNP" },
];

line("-- media / store_products / store_product_translations / store_product_media");
const mediaRows: string[] = [];
const productRows: string[] = [];
const productTransRows: string[] = [];
const productMediaRows: string[] = [];
let mediaId = 0;
let productId = 0;
let productSort = 0;
for (const p of productDefs) {
  mediaId++;
  mediaRows.push(`(${mediaId}, ${str("external")}, ${str("")}, ${str(p.imageUrl)}, ${str(p.imageUrl)}, ${str("image/jpeg")}, ${str(p.nameEn)})`);

  productId++;
  productRows.push(
    `(${productId}, ${storeCategoryIdBySlug.get(p.category)!}, ${str(p.slug)}, ${str(p.price)}, ${str("EGP")}, ${bool(!!p.isBestSeller)}, ${bool(!!p.isBestSeller)}, 1, ${productSort++}, 100, ${str(p.rating)})`,
  );
  productTransRows.push(`(${productId}, ${str("en")}, ${str(p.nameEn)}, ${str(p.descEn)})`);
  productMediaRows.push(`(${productId}, ${mediaId}, 0, 1)`);
}
line(`INSERT INTO ${col("media")} (${col("id")}, ${col("disk")}, ${col("bucket")}, ${col("object_key")}, ${col("url")}, ${col("mime")}, ${col("alt")}) VALUES`);
line(mediaRows.join(",\n") + ";");
line(
  `INSERT INTO ${col("store_products")} (${col("id")}, ${col("category_id")}, ${col("slug")}, ${col("price")}, ${col("currency")}, ${col("is_best_seller")}, ${col("is_featured_home")}, ${col("is_active")}, ${col("sort_order")}, ${col("stock_qty")}, ${col("rating")}) VALUES`,
);
line(productRows.join(",\n") + ";");
line(`INSERT INTO ${col("store_product_translations")} (${col("product_id")}, ${col("locale")}, ${col("name")}, ${col("description")}) VALUES`);
line(productTransRows.join(",\n") + ";");
line(`INSERT INTO ${col("store_product_media")} (${col("product_id")}, ${col("media_id")}, ${col("sort_order")}, ${col("is_primary")}) VALUES`);
line(productMediaRows.join(",\n") + ";");
line();
rowCounts.media = (rowCounts.media ?? 0) + mediaRows.length;
rowCounts.store_products = productRows.length;
rowCounts.store_product_translations = productTransRows.length;
rowCounts.store_product_media = productMediaRows.length;

line("SET FOREIGN_KEY_CHECKS = 1;");
line();

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
// CRLF line endings: this file is meant to be opened directly in Windows tools
// (Notepad, MySQL Workbench, phpMyAdmin's editor) — bare LF renders as one
// giant collapsed line in older/plainer Windows text viewers. MySQL itself
// doesn't care either way (\r is just whitespace to the SQL parser).
const finalText = (out.join("\n") + "\n").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
fs.writeFileSync(OUT_PATH, finalText);

console.log(`Wrote ${OUT_PATH}`);
console.log(`Schema: ${tableCount} tables`);
console.log("Seed row counts:");
for (const [table, n] of Object.entries(rowCounts)) console.log(`  ${table}: ${n}`);
console.log(`\nAdmin login baked into this dump: ${adminEmail} / ${adminPassword}`);
