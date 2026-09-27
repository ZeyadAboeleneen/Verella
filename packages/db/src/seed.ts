import "./env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { PERMISSION_SLUGS, ROLE_DEFINITIONS, permissionGroup } from "@verella/core";
import * as schema from "./schema";
import { importCatalog } from "./catalog/import";

const {
  branches,
  permissions,
  roles,
  rolePermissions,
  users,
  userRoles,
  paymentMethods,
  settings,
} = schema;

const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");

  const connection = await mysql.createConnection(url);
  const db = drizzle(connection, { schema, mode: "default" });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "hanarabeea707@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  // The demo password is fine on a laptop, never on a server that holds real
  // customer data — refuse rather than ship a guessable super-admin login.
  const isLocalDb = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  if (!isLocalDb && (adminPassword === DEFAULT_ADMIN_PASSWORD || adminPassword.length < 12)) {
    throw new Error("Refusing to seed a non-local database with a weak admin password. Set SEED_ADMIN_PASSWORD (12+ characters).");
  }

  const existing = await db.select({ id: roles.id }).from(roles).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded — aborting. Truncate tables manually if you want to reseed.");
    await connection.end();
    return;
  }

  console.log("Seeding branch...");
  const [branch] = await db
    .insert(branches)
    .values({ code: "MAIN", name: "Verella — Main Branch", currency: "EGP" })
    .$returningId();

  console.log("Seeding permissions & roles...");
  const insertedPermissions = await db
    .insert(permissions)
    .values(PERMISSION_SLUGS.map((slug) => ({ slug, group: permissionGroup(slug) })))
    .$returningId();
  const permIdBySlug = new Map(PERMISSION_SLUGS.map((slug, i) => [slug, insertedPermissions[i].id]));

  const roleIdBySlug = new Map<string, number>();
  for (const def of ROLE_DEFINITIONS) {
    const [row] = await db.insert(roles).values({ slug: def.slug, name: def.name, isSystem: def.isSystem }).$returningId();
    roleIdBySlug.set(def.slug, row.id);
    if (def.permissions.length > 0) {
      await db.insert(rolePermissions).values(
        def.permissions.map((slug) => ({ roleId: row.id, permissionId: permIdBySlug.get(slug)! })),
      );
    }
  }

  console.log("Seeding super admin user...");
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const [adminUser] = await db
    .insert(users)
    .values({
      email: adminEmail,
      fullName: "Verella Admin",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .$returningId();
  await db.insert(userRoles).values({ userId: adminUser.id, roleId: roleIdBySlug.get("super_admin")! });
  // Only echo the password when it's the well-known local default — a real one shouldn't land in server logs.
  console.log(`  -> Super admin created: ${adminEmail}${adminPassword === DEFAULT_ADMIN_PASSWORD ? ` / ${adminPassword} (local default)` : ""}`);

  console.log("Seeding payment methods...");
  // Card and Apple Pay stay off until the payment gateway is connected.
  await db.insert(paymentMethods).values([
    { code: "cash_on_delivery", name: "Cash on Delivery", isActive: true, sortOrder: 1 },
    { code: "instapay", name: "InstaPay", isActive: true, sortOrder: 2 },
    { code: "vodafone_cash", name: "Vodafone Cash", isActive: true, sortOrder: 3 },
    { code: "card", name: "Credit / Debit Card", isActive: false, sortOrder: 4 },
    { code: "apple_pay", name: "Apple Pay", isActive: false, sortOrder: 5 },
  ]);

  console.log("Seeding settings...");
  await db.insert(settings).values([
    { group: "site", key: "name", value: { en: "Verella", ar: "ڤيريلا" } },
    { group: "site", key: "default_locale", value: "en" },
    { group: "site", key: "supported_locales", value: ["en", "ar"] },
    { group: "site", key: "currency", value: "EGP" },
    { group: "checkout", key: "tax_enabled", value: false },
    // No physical store yet, so delivery only; pickup can be switched on in Settings.
    { group: "checkout", key: "fulfillment_types", value: ["delivery"] },
    // The InstaPay & Vodafone Cash wallet published in the brand guidelines.
    { group: "checkout", key: "instapay_number", value: "01062127633" },
    { group: "checkout", key: "vodafone_cash_number", value: "01062127633" },
    { group: "checkout", key: "guest_checkout_enabled", value: true },
    // Flat placeholder — replace with a real delivery-zone table once zones/fees are defined.
    { group: "checkout", key: "delivery_fee", value: "30.00" },
  ]);

  // ── Catalog ───────────────────────────────────────────────────────────────
  // Verella's real launch catalog (src/catalog) — categories, products,
  // descriptions and photos from apps/web/public/products.
  console.log("Seeding catalog...");
  await importCatalog(db, (msg) => console.log(`  ${msg}`));

  console.log("\nSeed complete.");
  console.log(`Branch: ${branch.id} | Admin login: ${adminEmail}`);
  console.log("Stock is a placeholder (10 per item) — set real counts in the dashboard.");

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
