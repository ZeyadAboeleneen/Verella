import { and, eq, isNull, notInArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../schema";
import { CATALOG_CATEGORIES } from "./categories";
import { CATALOG_PRODUCTS, type CatalogProduct } from "./products";

const {
  media,
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
  storeProductCategories,
  storeProductVariants,
} = schema;

type Db = MySql2Database<typeof schema>;

/** Placeholder stock for new listings — set real counts in the dashboard. */
const DEFAULT_STOCK = 10;

async function mediaId(db: Db, url: string, mime: string, alt: string, folder: string): Promise<number> {
  const [existing] = await db.select({ id: media.id }).from(media).where(eq(media.url, url)).limit(1);
  if (existing) return existing.id;
  const [row] = await db
    .insert(media)
    .values({ disk: "local", bucket: "public", objectKey: url.replace(/^\//, ""), url, mime, alt, folder })
    .$returningId();
  return row.id;
}

/** Styled image first, then the untouched original — for each photo the product has. */
function productImages(p: CatalogProduct) {
  return p.images.flatMap((folder) => [
    { url: `/products/${folder}/styled.webp`, mime: "image/webp" },
    { url: `/products/${folder}/original.png`, mime: "image/png" },
  ]);
}

/**
 * Brings the store's categories and products in line with src/catalog.
 * Safe to re-run: existing rows are updated in place (stock is never
 * overwritten), catalog products that disappeared are soft-deleted, and
 * categories no longer in the structure are switched off — never hard-deleted,
 * so past orders keep their references.
 */
export async function importCatalog(db: Db, log: (msg: string) => void = console.log) {
  // ── Categories ──────────────────────────────────────────────────────────
  const categoryIdBySlug = new Map<string, number>();
  for (const [sortOrder, c] of CATALOG_CATEGORIES.entries()) {
    const imageMediaId = await mediaId(db, `/categories/${c.slug}.webp`, "image/webp", c.nameEn, "categories");
    const [existing] = await db.select({ id: storeCategories.id }).from(storeCategories).where(eq(storeCategories.slug, c.slug)).limit(1);
    let id: number;
    if (existing) {
      id = existing.id;
      await db.update(storeCategories).set({ imageMediaId, sortOrder, isActive: true }).where(eq(storeCategories.id, id));
      await db.delete(storeCategoryTranslations).where(eq(storeCategoryTranslations.categoryId, id));
    } else {
      [{ id }] = await db.insert(storeCategories).values({ slug: c.slug, imageMediaId, sortOrder, isActive: true }).$returningId();
    }
    await db.insert(storeCategoryTranslations).values([
      { categoryId: id, locale: "en", name: c.nameEn, description: c.descEn },
      { categoryId: id, locale: "ar", name: c.nameAr, description: c.descAr },
    ]);
    categoryIdBySlug.set(c.slug, id);
  }
  const retiredCategories = await db
    .update(storeCategories)
    .set({ isActive: false })
    .where(notInArray(storeCategories.slug, CATALOG_CATEGORIES.map((c) => c.slug)));
  log(`Categories: ${CATALOG_CATEGORIES.length} active, ${retiredCategories[0].affectedRows} switched off.`);

  // ── Products ────────────────────────────────────────────────────────────
  let created = 0;
  let updated = 0;
  for (const [sortOrder, p] of CATALOG_PRODUCTS.entries()) {
    const [primary, ...extra] = p.categories.map((slug) => {
      const id = categoryIdBySlug.get(slug);
      if (!id) throw new Error(`${p.slug}: unknown category "${slug}"`);
      return id;
    });
    const values = {
      categoryId: primary,
      brand: p.brand,
      price: p.variants?.[0]?.price ?? p.price,
      currency: "EGP",
      isBestSeller: p.isBestSeller ?? false,
      isFeaturedHome: p.isFeaturedHome ?? false,
      sortOrder,
      isActive: true,
      deletedAt: null,
    };

    const [existing] = await db.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.slug, p.slug)).limit(1);
    let productId: number;
    if (existing) {
      productId = existing.id;
      await db.update(storeProducts).set(values).where(eq(storeProducts.id, productId));
      await db.delete(storeProductTranslations).where(eq(storeProductTranslations.productId, productId));
      await db.delete(storeProductMedia).where(eq(storeProductMedia.productId, productId));
      await db.delete(storeProductCategories).where(eq(storeProductCategories.productId, productId));
      updated++;
    } else {
      [{ id: productId }] = await db
        .insert(storeProducts)
        .values({ ...values, slug: p.slug, stockQty: p.variants ? 0 : DEFAULT_STOCK })
        .$returningId();
      created++;
    }

    await db.insert(storeProductTranslations).values([
      { productId, locale: "en", name: p.nameEn, description: p.descEn, notes: p.notesEn ?? null },
      { productId, locale: "ar", name: p.nameAr, description: p.descAr, notes: p.notesAr ?? null },
    ]);
    if (extra.length > 0) {
      await db.insert(storeProductCategories).values(extra.map((categoryId) => ({ productId, categoryId })));
    }

    for (const [i, img] of productImages(p).entries()) {
      const id = await mediaId(db, img.url, img.mime, `${p.nameEn} — ${p.brand}`, "products");
      await db.insert(storeProductMedia).values({ productId, mediaId: id, sortOrder: i, isPrimary: i === 0 });
    }

    // Variants: matched by label so re-imports keep their ids (and stock).
    for (const [vSort, v] of (p.variants ?? []).entries()) {
      const [row] = await db
        .select({ id: storeProductVariants.id })
        .from(storeProductVariants)
        .where(and(eq(storeProductVariants.productId, productId), eq(storeProductVariants.label, v.label)))
        .limit(1);
      if (row) {
        await db.update(storeProductVariants).set({ price: v.price, sortOrder: vSort, isActive: true }).where(eq(storeProductVariants.id, row.id));
      } else {
        await db.insert(storeProductVariants).values({
          productId,
          axis: "volume",
          label: v.label,
          price: v.price,
          stockQty: DEFAULT_STOCK,
          sortOrder: vSort,
          isActive: true,
        });
      }
    }
  }

  // Anything else still listed (e.g. the old demo catalog) comes off the shelf.
  const catalogSlugs = CATALOG_PRODUCTS.map((p) => p.slug);
  const [retired] = await db
    .update(storeProducts)
    .set({ isActive: false, deletedAt: new Date() })
    .where(and(notInArray(storeProducts.slug, catalogSlugs), isNull(storeProducts.deletedAt)));
  log(`Products: ${created} created, ${updated} updated, ${retired.affectedRows} retired.`);

  return { categoryIdBySlug, productCount: CATALOG_PRODUCTS.length };
}

