import "./env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { PERMISSION_SLUGS, ROLE_DEFINITIONS, permissionGroup } from "@verella/core";
import * as schema from "./schema";

const {
  branches,
  permissions,
  roles,
  rolePermissions,
  users,
  userRoles,
  paymentMethods,
  settings,
  menuCategories,
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  menuItemSizes,
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  media,
  storeProductMedia,
} = schema;

import { menuCategoryDefs } from "./menu-catalog";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");

  const connection = await mysql.createConnection(url);
  const db = drizzle(connection, { schema, mode: "default" });

  const existing = await db.select({ id: roles.id }).from(roles).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded — aborting. Truncate tables manually if you want to reseed.");
    await connection.end();
    return;
  }

  console.log("Seeding branch...");
  const [branch] = await db
    .insert(branches)
    .values({ code: "MAIN", name: "Hamid Afandi — Main Branch", currency: "EGP" })
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
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "hanarabeea707@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const [adminUser] = await db
    .insert(users)
    .values({
      email: adminEmail,
      fullName: "Hamid Afandi Admin",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .$returningId();
  await db.insert(userRoles).values({ userId: adminUser.id, roleId: roleIdBySlug.get("super_admin")! });
  console.log(`  -> Super admin created: ${adminEmail} / ${adminPassword} (CHANGE THIS PASSWORD IMMEDIATELY)`);

  console.log("Seeding payment methods...");
  await db.insert(paymentMethods).values([
    { code: "cash_on_delivery", name: "Cash on Delivery", isActive: true, sortOrder: 1 },
    { code: "instapay", name: "InstaPay", isActive: true, sortOrder: 2 },
  ]);

  console.log("Seeding settings...");
  await db.insert(settings).values([
    { group: "site", key: "name", value: { en: "Hamid Afandi", ar: "حامد أفندي" } },
    { group: "site", key: "default_locale", value: "en" },
    { group: "site", key: "supported_locales", value: ["en", "ar"] },
    { group: "site", key: "currency", value: "EGP" },
    { group: "checkout", key: "tax_enabled", value: false },
    { group: "checkout", key: "fulfillment_types", value: ["delivery", "pickup"] },
    { group: "checkout", key: "guest_checkout_enabled", value: true },
    // Flat placeholder — replace with a real delivery-zone table once zones/fees are defined.
    { group: "checkout", key: "delivery_fee", value: "30.00" },
  ]);

  // ── Menu catalog ──────────────────────────────────────────────────────────
  console.log("Seeding menu catalog...");
  let menuSort = 0;
  for (const cat of menuCategoryDefs) {
    // Admin-replaceable placeholder image — see MenuCategoryForm's MediaPicker.
    const [imageRow] = await db
      .insert(media)
      .values({ disk: "external", bucket: "", objectKey: cat.image, url: cat.image, mime: "image/jpeg", alt: cat.imageAlt, folder: "menu-categories" })
      .$returningId();

    const [catRow] = await db
      .insert(menuCategories)
      .values({ slug: cat.slug, icon: cat.icon, imageMediaId: imageRow.id, sortOrder: menuSort++, isActive: true })
      .$returningId();
    await db.insert(menuCategoryTranslations).values([
      { categoryId: catRow.id, locale: "en", name: cat.nameEn },
      { categoryId: catRow.id, locale: "ar", name: cat.nameAr },
    ]);

    let itemSort = 0;
    for (const item of cat.items) {
      const [itemRow] = await db
        .insert(menuItems)
        .values({
          categoryId: catRow.id,
          slug: item.slug,
          currency: "EGP",
          badge: item.badge,
          isNew: item.badge === "New",
          sortOrder: itemSort++,
          isActive: true,
        })
        .$returningId();
      await db.insert(menuItemTranslations).values([
        {
          itemId: itemRow.id,
          locale: "en",
          name: item.nameEn,
          description: item.descEn,
        },
        {
          itemId: itemRow.id,
          locale: "ar",
          name: item.nameAr,
          description: item.descAr,
        },
      ]);
      if (item.sizes && item.sizes.length > 0) {
        let szSort = 0;
        for (const s of item.sizes) {
          await db.insert(menuItemSizes).values({
            itemId: itemRow.id,
            size: s.sizeEn,
            price: s.price,
            sortOrder: szSort++,
          });
        }
      } else {
        await db.insert(menuItemSizes).values({
          itemId: itemRow.id,
          size: "Regular",
          price: item.price,
          sortOrder: 0,
        });
      }
    }
  }

  // ── Store catalog ────────────────────────────────────────────────────────
  console.log("Seeding store catalog...");
  const storeCategoryDefs: { slug: string; nameEn: string; nameAr: string }[] = [
    { slug: "beans", nameEn: "Coffee Beans", nameAr: "حبوب القهوة" },
    { slug: "turkish", nameEn: "Turkish Coffee", nameAr: "قهوة تركي" },
    { slug: "espresso", nameEn: "Espresso", nameAr: "إسبريسو" },
    { slug: "accessories", nameEn: "Accessories", nameAr: "إكسسوارات" },
    { slug: "gifts", nameEn: "Gifts", nameAr: "هدايا" },
  ];
  const storeCategoryIdBySlug = new Map<string, number>();
  let storeCatSort = 0;
  for (const cat of storeCategoryDefs) {
    const [row] = await db
      .insert(storeCategories)
      .values({ slug: cat.slug, sortOrder: storeCatSort++, isActive: true })
      .$returningId();
    storeCategoryIdBySlug.set(cat.slug, row.id);
    await db.insert(storeCategoryTranslations).values([
      { categoryId: row.id, locale: "en", name: cat.nameEn },
      { categoryId: row.id, locale: "ar", name: cat.nameAr },
    ]);
  }

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

  let productSort = 0;
  for (const p of productDefs) {
    // NOTE: seeded with the original Google-hosted placeholder images so the
    // storefront isn't empty on first run. Re-upload real product photos via
    // the dashboard Media Library — that stores them in MinIO like any other upload.
    const [mediaRow] = await db
      .insert(media)
      .values({
        disk: "external",
        bucket: "",
        objectKey: p.imageUrl,
        url: p.imageUrl,
        mime: "image/jpeg",
        alt: p.nameEn,
      })
      .$returningId();

    const [productRow] = await db
      .insert(storeProducts)
      .values({
        categoryId: storeCategoryIdBySlug.get(p.category)!,
        slug: p.slug,
        price: p.price,
        currency: "EGP",
        isBestSeller: p.isBestSeller ?? false,
        isFeaturedHome: p.isBestSeller ?? false,
        stockQty: 100,
        rating: p.rating,
        sortOrder: productSort++,
        isActive: true,
      })
      .$returningId();

    await db.insert(storeProductTranslations).values({
      productId: productRow.id,
      locale: "en",
      name: p.nameEn,
      description: p.descEn,
    });

    await db.insert(storeProductMedia).values({
      productId: productRow.id,
      mediaId: mediaRow.id,
      isPrimary: true,
      sortOrder: 0,
    });
  }

  console.log("\nSeed complete.");
  console.log(`Branch: ${branch.id} | Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("Arabic translations were seeded for categories only — item/product Arabic text still needs to be filled in via the dashboard.");

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
