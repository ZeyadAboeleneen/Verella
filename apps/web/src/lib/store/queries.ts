import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, isNull, like } from "drizzle-orm";
import {
  db,
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
  storeHeroImages,
  media,
} from "@verella/db";
import { formatMoney, toCents, computeDiscountAmountCents, isDiscountWindowOpen, type Locale, type DiscountLike } from "@verella/core";
import { getAutoDiscounts } from "@/lib/discounts/resolve";
import { withDbTimeout } from "@/lib/db-timeout";

/**
 * 60s time-based cache on the read-heavy public catalog queries — this is a
 * remote, shared MySQL host (see docs/SETUP.md), and every page load was
 * hitting it fresh. Deliberately NOT using unstable_cache's tag-based
 * invalidation here: Next 16 deprecated the single-arg revalidateTag() this
 * package predates, and the two-arg profile-based replacement's interop with
 * unstable_cache's own tag system isn't documented — silently-broken
 * invalidation (admin edits never appearing) is worse than 60s of staleness.
 * Store/menu admin actions already call revalidatePath for the page shell;
 * this only affects how fresh the underlying data fetch is within that window.
 */
const CATALOG_REVALIDATE_SECONDS = 60;

export interface StoreCategoryView {
  slug: string;
  name: string;
}

export interface StoreProductView {
  id: number;
  slug: string;
  name: string;
  price: string;
  compareAtPrice: string | null;
  /** null = product has no reviews yet — render an unrated state, don't fabricate a score. */
  rating: number | null;
  tag: string;
  badge?: string;
  image: string;
  alt: string;
  categorySlug: string;
  stockQty: number;
  isFeaturedHome: boolean;
  isBestSeller: boolean;
}

function pickTranslation<T extends { locale: string }>(rows: T[], locale: Locale): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "en");
}

/**
 * Codeless ("automatic") discounts — created in Admin → Discounts with no
 * code — apply straight to the storefront price/compare-at display, with no
 * code needed at checkout (checkout already applies these the same way; this
 * mirrors that so the sale is visible before the cart, not just at the total).
 * If several auto-discounts match a product, the single largest saving wins —
 * this is display only, so there's no need for the cart's proportional-split
 * stacking logic.
 */
function applyAutoDiscount(priceCents: number, categoryId: number, productId: number, autoDiscounts: DiscountLike[], now = new Date()): number {
  let bestDiscountCents = 0;
  for (const d of autoDiscounts) {
    if (!isDiscountWindowOpen(d, now)) continue;
    const matches =
      d.scope === "all" || (d.scope === "category" && d.categoryIds?.includes(categoryId)) || (d.scope === "product" && d.productIds?.includes(productId));
    if (!matches) continue;
    const amount = computeDiscountAmountCents(d, [{ productId, categoryId, unitPriceCents: priceCents, quantity: 1 }]);
    if (amount > bestDiscountCents) bestDiscountCents = amount;
  }
  return Math.max(0, priceCents - bestDiscountCents);
}

async function getStoreCategoriesImpl(locale: Locale = "en"): Promise<StoreCategoryView[]> {
  const categoryRows = await db
    .select()
    .from(storeCategories)
    .where(eq(storeCategories.isActive, true))
    .orderBy(asc(storeCategories.sortOrder));
  if (categoryRows.length === 0) return [];

  const translations = await db
    .select()
    .from(storeCategoryTranslations)
    .where(inArray(storeCategoryTranslations.categoryId, categoryRows.map((c) => c.id)));

  return categoryRows.map((cat) => {
    const t = pickTranslation(translations.filter((x) => x.categoryId === cat.id), locale);
    return { slug: cat.slug, name: t?.name ?? cat.slug };
  });
}

export const getStoreCategories = unstable_cache(getStoreCategoriesImpl, ["store-categories"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});

export interface StoreProductFilter {
  categorySlug?: string;
  /** Filter in SQL rather than fetching the whole catalog and filtering in JS — see getBestSellerProducts. */
  onlyBestSeller?: boolean;
  limit?: number;
  /** Matches against product name/description translations (any locale). */
  search?: string;
}

async function getStoreProductsImpl(locale: Locale = "en", filter: string | StoreProductFilter = {}): Promise<StoreProductView[]> {
  // Back-compat: a bare string is still treated as categorySlug (existing callers pass a string).
  const { categorySlug, onlyBestSeller, limit, search } = typeof filter === "string" ? { categorySlug: filter } as StoreProductFilter : filter;

  const categoryRows = await db.select().from(storeCategories).where(eq(storeCategories.isActive, true));
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c]));
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

  let searchProductIds: number[] | null = null;
  if (search && search.trim()) {
    const matches = await db
      .selectDistinct({ productId: storeProductTranslations.productId })
      .from(storeProductTranslations)
      .where(like(storeProductTranslations.name, `%${search.trim()}%`));
    searchProductIds = matches.map((m) => m.productId);
    if (searchProductIds.length === 0) return [];
  }

  const categoryIds = categorySlug && categoryBySlug.has(categorySlug)
    ? [categoryBySlug.get(categorySlug)!.id]
    : categoryRows.map((c) => c.id);
  if (categoryIds.length === 0) return [];

  const conditions = [eq(storeProducts.isActive, true), isNull(storeProducts.deletedAt), inArray(storeProducts.categoryId, categoryIds)];
  if (onlyBestSeller) conditions.push(eq(storeProducts.isBestSeller, true));
  if (searchProductIds) conditions.push(inArray(storeProducts.id, searchProductIds));

  let query = db
    .select()
    .from(storeProducts)
    .where(and(...conditions))
    .orderBy(asc(storeProducts.sortOrder))
    .$dynamic();
  if (limit) query = query.limit(limit);
  const products = await query;
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const [translations, mediaRows, autoDiscounts] = await Promise.all([
    db.select().from(storeProductTranslations).where(inArray(storeProductTranslations.productId, productIds)),
    db
      .select({ productId: storeProductMedia.productId, url: media.url, isPrimary: storeProductMedia.isPrimary })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(inArray(storeProductMedia.productId, productIds)),
    getAutoDiscounts(),
  ]);

  return products.map((p) => {
    const t = pickTranslation(translations.filter((x) => x.productId === p.id), locale);
    const primaryMedia = mediaRows.find((m) => m.productId === p.id && m.isPrimary) ?? mediaRows.find((m) => m.productId === p.id);
    const category = categoryById.get(p.categoryId);

    const priceCents = toCents(p.price);
    const discountedCents = applyAutoDiscount(priceCents, p.categoryId, p.id, autoDiscounts);
    const hasAutoDiscount = discountedCents < priceCents;

    return {
      id: p.id,
      slug: p.slug,
      name: t?.name ?? p.slug,
      price: formatMoney(hasAutoDiscount ? discountedCents : priceCents, p.currency, locale),
      compareAtPrice: hasAutoDiscount
        ? formatMoney(priceCents, p.currency, locale)
        : p.compareAtPrice
          ? formatMoney(toCents(p.compareAtPrice), p.currency, locale)
          : null,
      rating: p.rating ? Number(p.rating) : null,
      tag: category?.slug ?? "",
      badge: p.isBestSeller ? "Bestseller" : undefined,
      image: primaryMedia?.url ?? "",
      alt: t?.name ?? p.slug,
      categorySlug: category?.slug ?? "",
      stockQty: p.stockQty,
      isFeaturedHome: p.isFeaturedHome,
      isBestSeller: p.isBestSeller,
    };
  });
}

export const getStoreProducts = unstable_cache(getStoreProductsImpl, ["store-products"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});

export interface StoreProductDetailView extends StoreProductView {
  description: string | null;
  notes: string | null;
  images: { url: string; alt: string }[];
}

async function getStoreProductBySlugImpl(slug: string, locale: Locale = "en"): Promise<StoreProductDetailView | null> {
  const [product] = await db
    .select()
    .from(storeProducts)
    .where(and(eq(storeProducts.slug, slug), eq(storeProducts.isActive, true), isNull(storeProducts.deletedAt)))
    .limit(1);
  if (!product) return null;

  const [category, translations, mediaRows, autoDiscounts] = await Promise.all([
    db.select().from(storeCategories).where(eq(storeCategories.id, product.categoryId)).limit(1).then((r) => r[0]),
    db.select().from(storeProductTranslations).where(eq(storeProductTranslations.productId, product.id)),
    db
      .select({ url: media.url, isPrimary: storeProductMedia.isPrimary, sortOrder: storeProductMedia.sortOrder })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(eq(storeProductMedia.productId, product.id))
      .orderBy(asc(storeProductMedia.sortOrder)),
    getAutoDiscounts(),
  ]);

  const t = pickTranslation(translations, locale);
  const primaryMedia = mediaRows.find((m) => m.isPrimary) ?? mediaRows[0];

  const priceCents = toCents(product.price);
  const discountedCents = applyAutoDiscount(priceCents, product.categoryId, product.id, autoDiscounts);
  const hasAutoDiscount = discountedCents < priceCents;

  return {
    id: product.id,
    slug: product.slug,
    name: t?.name ?? product.slug,
    description: t?.description ?? null,
    notes: t?.notes ?? null,
    price: formatMoney(hasAutoDiscount ? discountedCents : priceCents, product.currency, locale),
    compareAtPrice: hasAutoDiscount
      ? formatMoney(priceCents, product.currency, locale)
      : product.compareAtPrice
        ? formatMoney(toCents(product.compareAtPrice), product.currency, locale)
        : null,
    rating: product.rating ? Number(product.rating) : null,
    tag: category?.slug ?? "",
    badge: product.isBestSeller ? "Bestseller" : undefined,
    image: primaryMedia?.url ?? "",
    alt: t?.name ?? product.slug,
    images: mediaRows.map((m) => ({ url: m.url, alt: t?.name ?? product.slug })),
    categorySlug: category?.slug ?? "",
    stockQty: product.stockQty,
    isFeaturedHome: product.isFeaturedHome,
    isBestSeller: product.isBestSeller,
  };
}

export const getStoreProductBySlug = unstable_cache(getStoreProductBySlugImpl, ["store-product-by-slug"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});

// Not cached: same rationale as getMenuHeroImages — this table is tiny and
// rarely queried, so admin changes should appear immediately rather than
// waiting out the 60s catalog cache window.
export async function getStoreHeroImages(): Promise<string[]> {
  const rows = await db
    .select({ url: media.url })
    .from(storeHeroImages)
    .innerJoin(media, eq(media.id, storeHeroImages.mediaId))
    .where(eq(storeHeroImages.isActive, true))
    .orderBy(asc(storeHeroImages.sortOrder));
  return rows.map((r) => r.url);
}

// Previously this called getStoreProductsImpl directly — bypassing the 60s
// unstable_cache that /store's identical query pipeline gets. Store/menu
// admin actions already call revalidatePath("/") on save, so the same
// up-to-60s staleness trade-off already accepted for /store applies here too.
async function getBestSellerProductsImpl(locale: Locale = "en", limit = 8): Promise<StoreProductView[]> {
  return withDbTimeout(getStoreProductsImpl(locale, { onlyBestSeller: true, limit }));
}
export const getBestSellerProducts = unstable_cache(getBestSellerProductsImpl, ["best-seller-products"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});
