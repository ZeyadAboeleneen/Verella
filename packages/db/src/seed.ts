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
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  storeProductVariants,
  storeProductVariantTranslations,
  storeProductMedia,
  media,
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
  // Demo products and placeholder photos: on by default for local work,
  // SEED_DEMO_CATALOG=false for production (categories are still created).
  const demoCatalog = process.env.SEED_DEMO_CATALOG !== "false";

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
  // DEMO catalog: fictional brands and picsum placeholder photography (black
  // and white, so it stays inside the brand palette). Replace with real
  // inventory and photos from the dashboard before launch.
  console.log(demoCatalog ? "Seeding categories + demo catalog..." : "Seeding categories...");
  const photo = (seed: string, w: number, h: number) => `https://picsum.photos/seed/verella-${seed}/${w}/${h}?grayscale`;
  const addMedia = async (url: string, alt: string, folder: string) => {
    const [row] = await db
      .insert(media)
      .values({ disk: "external", bucket: "", objectKey: url, url, mime: "image/jpeg", alt, folder })
      .$returningId();
    return row.id;
  };

  const storeCategoryDefs: { slug: string; nameEn: string; nameAr: string; descEn: string; descAr: string }[] = [
    { slug: "fragrances", nameEn: "Fragrances", nameAr: "العطور", descEn: "Signature scents from the brands worth discovering.", descAr: "روائح مميزة من براندات تستاهل تكتشفها." },
    { slug: "musk-oud", nameEn: "Musk & Oud", nameAr: "المسك والعود", descEn: "Deep, warm and unmistakably ours.", descAr: "دافئ وعميق وبطابعنا." },
    { slug: "personal-care", nameEn: "Personal Care", nameAr: "العناية الشخصية", descEn: "Everyday rituals, done properly.", descAr: "روتين يومي معمول صح." },
    { slug: "women", nameEn: "Women", nameAr: "حريمي", descEn: "The look — edited for her.", descAr: "الإطلالة — مختارة ليها." },
    { slug: "men", nameEn: "Men", nameAr: "رجالي", descEn: "The look — edited for him.", descAr: "الإطلالة — مختارة ليه." },
    { slug: "gifts", nameEn: "Gift Sets", nameAr: "الهدايا", descEn: "Ready to give. Easy to love.", descAr: "جاهزة للإهداء." },
  ];
  const storeCategoryIdBySlug = new Map<string, number>();
  let storeCatSort = 0;
  for (const cat of storeCategoryDefs) {
    const imageMediaId = demoCatalog ? await addMedia(photo(`cat-${cat.slug}`, 1200, 1600), cat.nameEn, "categories") : null;
    const [row] = await db
      .insert(storeCategories)
      .values({ slug: cat.slug, imageMediaId, sortOrder: storeCatSort++, isActive: true })
      .$returningId();
    storeCategoryIdBySlug.set(cat.slug, row.id);
    await db.insert(storeCategoryTranslations).values([
      { categoryId: row.id, locale: "en", name: cat.nameEn, description: cat.descEn },
      { categoryId: row.id, locale: "ar", name: cat.nameAr, description: cat.descAr },
    ]);
  }

  if (!demoCatalog) {
    console.log("\nSeed complete (no demo catalog). Add products from the dashboard.");
    console.log(`Admin login: ${adminEmail}`);
    await connection.end();
    return;
  }

  type VariantDef = { label: string; labelAr?: string; price: string; stock: number; compareAt?: string };
  type ProductDef = {
    slug: string; brand: string; category: string;
    nameEn: string; nameAr: string; descEn: string; descAr: string;
    price: string; compareAt?: string; axis?: "volume" | "size" | "color"; variants?: VariantDef[];
    isBestSeller?: boolean; featured?: boolean; stock?: number;
  };
  const S = (label: string, labelAr: string, price: string, stock: number): VariantDef => ({ label, labelAr, price, stock });
  const V = (label: string, price: string, stock: number, compareAt?: string): VariantDef => ({ label, price, stock, compareAt });

  const productDefs: ProductDef[] = [
    { slug: "amber-oud", brand: "Maison Nour", category: "fragrances", nameEn: "Amber Oud", nameAr: "آمبر عود",
      descEn: "A warm amber opening over a deep, smoky oud base.", descAr: "افتتاحية عنبر دافئة على قاعدة عود مدخّنة.",
      price: "1450.00", axis: "volume", isBestSeller: true, featured: true, variants: [V("50ml", "1450.00", 24), V("100ml", "2150.00", 12)] },
    { slug: "velvet-iris", brand: "Rose Bureau", category: "fragrances", nameEn: "Velvet Iris", nameAr: "فلفت آيريس",
      descEn: "Powdery iris, soft suede and a whisper of pear.", descAr: "آيريس بودري وجلد ناعم ولمسة كمثرى.",
      price: "1290.00", axis: "volume", featured: true, variants: [V("50ml", "1290.00", 9, "1490.00"), V("100ml", "1890.00", 4, "2190.00")] },
    { slug: "citrus-noir", brand: "Studio Nile", category: "fragrances", nameEn: "Citrus Noir", nameAr: "سيتروس نوار",
      descEn: "Bitter orange and black pepper — bright, then dark.", descAr: "برتقال مر وفلفل أسود — منعش وبعدين غامق.",
      price: "890.00", axis: "volume", variants: [V("30ml", "890.00", 30), V("50ml", "1190.00", 18), V("100ml", "1690.00", 0)] },
    { slug: "saffron-night", brand: "Maison Nour", category: "fragrances", nameEn: "Saffron Night", nameAr: "سافرون نايت",
      descEn: "Saffron, rose and resin for after dark.", descAr: "زعفران وورد وراتنج لليل.",
      price: "1990.00", axis: "volume", isBestSeller: true, variants: [V("100ml", "1990.00", 7)] },
    { slug: "white-musk", brand: "Oud & Co", category: "musk-oud", nameEn: "White Musk", nameAr: "مسك أبيض",
      descEn: "A clean, soft musk that stays close to the skin.", descAr: "مسك نظيف وناعم يبقى قريب من البشرة.",
      price: "780.00", axis: "volume", isBestSeller: true, variants: [V("30ml", "780.00", 40), V("60ml", "1180.00", 18)] },
    { slug: "royal-oud-oil", brand: "Oud & Co", category: "musk-oud", nameEn: "Royal Oud Oil", nameAr: "زيت العود الملكي",
      descEn: "Concentrated oud oil, aged for depth.", descAr: "زيت عود مركّز معتّق.",
      price: "1650.00", axis: "volume", featured: true, variants: [V("12ml", "1650.00", 6), V("24ml", "2950.00", 3)] },
    { slug: "musk-tahara", brand: "Atelier Sahara", category: "musk-oud", nameEn: "Musk Tahara", nameAr: "مسك الطهارة",
      descEn: "Creamy white musk in a travel roller.", descAr: "مسك أبيض كريمي في رول للسفر.",
      price: "260.00", stock: 0 },
    { slug: "rose-body-lotion", brand: "Rose Bureau", category: "personal-care", nameEn: "Rose Body Lotion", nameAr: "لوشن الجسم بالورد",
      descEn: "Lightweight daily lotion with a soft rose finish.", descAr: "لوشن يومي خفيف بلمسة ورد.",
      price: "320.00", stock: 60 },
    { slug: "oud-hair-mist", brand: "Oud & Co", category: "personal-care", nameEn: "Oud Hair Mist", nameAr: "معطّر شعر بالعود",
      descEn: "A light oud mist made for hair.", descAr: "رذاذ عود خفيف للشعر.",
      price: "450.00", compareAt: "540.00", stock: 25 },
    { slug: "musk-body-wash", brand: "Atelier Sahara", category: "personal-care", nameEn: "Musk Body Wash", nameAr: "شاور جل بالمسك",
      descEn: "A gentle wash that leaves a trail of musk.", descAr: "غسول ناعم بيسيب أثر مسك.",
      price: "290.00", stock: 45 },
    { slug: "silk-blouse", brand: "Studio Nile", category: "women", nameEn: "Silk Blouse", nameAr: "بلوزة حرير",
      descEn: "Relaxed silk blouse with a concealed placket.", descAr: "بلوزة حرير واسعة بأزرار مخفية.",
      price: "1650.00", axis: "size", featured: true, variants: [S("S", "صغير", "1650.00", 6), S("M", "وسط", "1650.00", 9), S("L", "كبير", "1650.00", 4)] },
    { slug: "pleated-skirt", brand: "Studio Nile", category: "women", nameEn: "Pleated Skirt", nameAr: "جيبة بليسيه",
      descEn: "Knife-pleated midi skirt that moves with you.", descAr: "جيبة ميدي بليسيه بتتحرك معاكي.",
      price: "1390.00", axis: "size", isBestSeller: true, variants: [S("S", "صغير", "1390.00", 5), S("M", "وسط", "1390.00", 0), S("L", "كبير", "1390.00", 3)] },
    { slug: "knit-cardigan", brand: "Atelier Sahara", category: "women", nameEn: "Knit Cardigan", nameAr: "كارديجان تريكو",
      descEn: "Chunky knit in a soft neutral.", descAr: "تريكو تقيل بلون هادي.",
      price: "1190.00", axis: "size", variants: [S("S", "صغير", "1190.00", 8), S("M", "وسط", "1190.00", 8)] },
    { slug: "cotton-shirt", brand: "Atelier Sahara", category: "men", nameEn: "Cotton Shirt", nameAr: "قميص قطن",
      descEn: "Structured cotton shirt cut for a regular fit.", descAr: "قميص قطن بقصة عادية.",
      price: "1250.00", axis: "size", featured: true, variants: [S("M", "وسط", "1250.00", 10), S("L", "كبير", "1250.00", 8), S("XL", "كبير جدًا", "1350.00", 5)] },
    { slug: "linen-trousers", brand: "Studio Nile", category: "men", nameEn: "Linen Trousers", nameAr: "بنطلون كتان",
      descEn: "Easy linen trousers with a drawstring waist.", descAr: "بنطلون كتان مريح بخصر رباط.",
      price: "1150.00", axis: "size", variants: [S("M", "وسط", "1150.00", 7), S("L", "كبير", "1150.00", 6)] },
    { slug: "discovery-set", brand: "Verella", category: "gifts", nameEn: "Discovery Set", nameAr: "طقم الاكتشاف",
      descEn: "Five miniatures selected by the Verella team.", descAr: "خمس عبوات صغيرة من اختيار فريق ڤيريلا.",
      price: "950.00", stock: 30, isBestSeller: true, featured: true },
    { slug: "oud-gift-box", brand: "Oud & Co", category: "gifts", nameEn: "Oud Gift Box", nameAr: "صندوق هدية العود",
      descEn: "Oud oil, musk and a keepsake box.", descAr: "زيت عود ومسك في صندوق هدية.",
      price: "2450.00", compareAt: "2800.00", stock: 10 },
  ];

  let productSort = 0;
  for (const p of productDefs) {
    const [productRow] = await db
      .insert(storeProducts)
      .values({
        categoryId: storeCategoryIdBySlug.get(p.category)!,
        slug: p.slug,
        brand: p.brand,
        price: p.price,
        compareAtPrice: p.compareAt ?? p.variants?.[0]?.compareAt ?? null,
        currency: "EGP",
        isBestSeller: p.isBestSeller ?? false,
        isFeaturedHome: p.featured ?? false,
        // Products that carry variants hold their stock per variant; this stays 0.
        stockQty: p.variants ? 0 : (p.stock ?? 0),
        sortOrder: productSort++,
        isActive: true,
      })
      .$returningId();

    await db.insert(storeProductTranslations).values([
      { productId: productRow.id, locale: "en", name: p.nameEn, description: p.descEn },
      { productId: productRow.id, locale: "ar", name: p.nameAr, description: p.descAr },
    ]);

    // Two shots per product so the listing can swap on hover.
    for (const [i, shot] of ["a", "b"].entries()) {
      const mediaId = await addMedia(photo(`${p.slug}-${shot}`, 900, 1125), p.nameEn, "products");
      await db.insert(storeProductMedia).values({ productId: productRow.id, mediaId, sortOrder: i, isPrimary: i === 0 });
    }

    if (p.variants) {
      let vSort = 0;
      for (const v of p.variants) {
        const [variantRow] = await db
          .insert(storeProductVariants)
          .values({
            productId: productRow.id,
            axis: p.axis ?? "volume",
            label: v.label,
            price: v.price,
            compareAtPrice: v.compareAt ?? null,
            stockQty: v.stock,
            sortOrder: vSort++,
            isActive: true,
          })
          .$returningId();
        // Only worth a translation row when the label isn't language-neutral.
        if (v.labelAr) {
          await db.insert(storeProductVariantTranslations).values([
            { variantId: variantRow.id, locale: "en", label: v.label },
            { variantId: variantRow.id, locale: "ar", label: v.labelAr },
          ]);
        }
      }
    }
  }

  console.log("\nSeed complete.");
  console.log(`Branch: ${branch.id} | Admin login: ${adminEmail}`);
  console.log("Demo catalog: fictional brands with placeholder photos — replace from the dashboard.");

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
