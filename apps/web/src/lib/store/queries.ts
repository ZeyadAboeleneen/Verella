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
  storeProductVariants,
  storeProductVariantTranslations,
  media,
  type VariantAxis,
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
  description: string | null;
  image: string | null;
}

export interface StoreVariantView {
  id: number;
  label: string;
  price: string;
  compareAtPrice: string | null;
  stockQty: number;
}

export interface StoreProductView {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  /** Sells in variants (sizes/volumes); the shopper must pick one before adding to cart. */
  hasVariants: boolean;
  /** Variants differ in price, so `price` is the lowest — render it as "from …". */
  priceFrom: boolean;
  /** Headline price in cents, for sorting. */
  priceValue: number;
  /** Active variants in display order; empty for simple products. */
  variants: StoreVariantView[];
  price: string;
  compareAtPrice: string | null;
  /** null = product has no reviews yet — render an unrated state, don't fabricate a score. */
  rating: number | null;
  tag: string;
  badge?: string;
  image: string;
  /** Second photo, revealed on hover in listings; null when there's only one. */
  hoverImage: string | null;
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

interface VariantRow {
  id: number;
  productId: number;
  axis: VariantAxis;
  label: string;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
}

async function loadVariants(productIds: number[], locale: Locale): Promise<Map<number, VariantRow[]>> {
  const byProduct = new Map<number, VariantRow[]>();
  if (productIds.length === 0) return byProduct;

  const rows = await db
    .select()
    .from(storeProductVariants)
    .where(and(inArray(storeProductVariants.productId, productIds), eq(storeProductVariants.isActive, true)))
    .orderBy(asc(storeProductVariants.sortOrder));
  if (rows.length === 0) return byProduct;

  const translations = await db
    .select()
    .from(storeProductVariantTranslations)
    .where(inArray(storeProductVariantTranslations.variantId, rows.map((r) => r.id)));

  for (const v of rows) {
    const t = pickTranslation(translations.filter((x) => x.variantId === v.id), locale);
    const list = byProduct.get(v.productId) ?? [];
    list.push({
      id: v.id,
      productId: v.productId,
      axis: v.axis,
      label: t?.label ?? v.label,
      priceCents: toCents(v.price),
      compareAtCents: v.compareAtPrice ? toCents(v.compareAtPrice) : null,
      stockQty: v.stockQty,
    });
    byProduct.set(v.productId, list);
  }
  return byProduct;
}

interface ProductPricing {
  price: string;
  priceCents: number;
  compareAtPrice: string | null;
  stockQty: number;
  hasVariants: boolean;
  priceFrom: boolean;
}

/**
 * The single place listing/detail prices come from. For a product with
 * variants, the headline price is the cheapest variant that's in stock (or
 * the cheapest overall when everything is sold out), and stock is the sum
 * across variants — so "Out of stock" only shows when no variant can sell.
 */
function priceProduct(
  product: { id: number; categoryId: number; price: string; compareAtPrice: string | null; currency: string; stockQty: number },
  variants: VariantRow[],
  autoDiscounts: DiscountLike[],
  locale: Locale,
): ProductPricing {
  const money = (cents: number) => formatMoney(cents, product.currency, locale);

  let baseCents = toCents(product.price);
  let compareCents = product.compareAtPrice ? toCents(product.compareAtPrice) : null;
  let stockQty = product.stockQty;
  let priceFrom = false;

  if (variants.length > 0) {
    const inStock = variants.filter((v) => v.stockQty > 0);
    const pool = inStock.length > 0 ? inStock : variants;
    const cheapest = pool.reduce((min, v) => (v.priceCents < min.priceCents ? v : min), pool[0]);
    baseCents = cheapest.priceCents;
    compareCents = cheapest.compareAtCents;
    stockQty = variants.reduce((sum, v) => sum + v.stockQty, 0);
    priceFrom = new Set(variants.map((v) => v.priceCents)).size > 1;
  }

  const discountedCents = applyAutoDiscount(baseCents, product.categoryId, product.id, autoDiscounts);
  const hasAutoDiscount = discountedCents < baseCents;

  return {
    price: money(hasAutoDiscount ? discountedCents : baseCents),
    priceCents: hasAutoDiscount ? discountedCents : baseCents,
    compareAtPrice: hasAutoDiscount ? money(baseCents) : compareCents ? money(compareCents) : null,
    stockQty,
    hasVariants: variants.length > 0,
    priceFrom,
  };
}

function formatVariants(
  product: { id: number; categoryId: number; currency: string },
  variants: VariantRow[],
  autoDiscounts: DiscountLike[],
  locale: Locale,
): StoreVariantView[] {
  const money = (cents: number) => formatMoney(cents, product.currency, locale);
  return variants.map((v) => {
    const discounted = applyAutoDiscount(v.priceCents, product.categoryId, product.id, autoDiscounts);
    const onSale = discounted < v.priceCents;
    return {
      id: v.id,
      label: v.label,
      price: money(onSale ? discounted : v.priceCents),
      compareAtPrice: onSale ? money(v.priceCents) : v.compareAtCents ? money(v.compareAtCents) : null,
      stockQty: v.stockQty,
    };
  });
}

async function getStoreCategoriesImpl(locale: Locale = "en"): Promise<StoreCategoryView[]> {
  const categoryRows = await db
    .select()
    .from(storeCategories)
    .where(eq(storeCategories.isActive, true))
    .orderBy(asc(storeCategories.sortOrder));
  if (categoryRows.length === 0) return [];

  const imageIds = categoryRows.map((c) => c.imageMediaId).filter((id): id is number => id != null);
  const [translations, images] = await Promise.all([
    db
      .select()
      .from(storeCategoryTranslations)
      .where(inArray(storeCategoryTranslations.categoryId, categoryRows.map((c) => c.id))),
    imageIds.length ? db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, imageIds)) : Promise.resolve([]),
  ]);

  return categoryRows.map((cat) => {
    const t = pickTranslation(translations.filter((x) => x.categoryId === cat.id), locale);
    return {
      slug: cat.slug,
      name: t?.name ?? cat.slug,
      description: t?.description ?? null,
      image: images.find((m) => m.id === cat.imageMediaId)?.url ?? null,
    };
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
  const [translations, mediaRows, autoDiscounts, variantsByProduct] = await Promise.all([
    db.select().from(storeProductTranslations).where(inArray(storeProductTranslations.productId, productIds)),
    db
      .select({ productId: storeProductMedia.productId, url: media.url, isPrimary: storeProductMedia.isPrimary })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(inArray(storeProductMedia.productId, productIds))
      .orderBy(asc(storeProductMedia.sortOrder)),
    getAutoDiscounts(),
    loadVariants(productIds, locale),
  ]);

  return products.map((p) => {
    const t = pickTranslation(translations.filter((x) => x.productId === p.id), locale);
    const productMedia = mediaRows.filter((m) => m.productId === p.id);
    const primaryMedia = productMedia.find((m) => m.isPrimary) ?? productMedia[0];
    const hoverMedia = productMedia.find((m) => m !== primaryMedia);
    const category = categoryById.get(p.categoryId);
    const productVariants = variantsByProduct.get(p.id) ?? [];
    const pricing = priceProduct(p, productVariants, autoDiscounts, locale);

    return {
      id: p.id,
      slug: p.slug,
      name: t?.name ?? p.slug,
      brand: p.brand,
      hasVariants: pricing.hasVariants,
      priceFrom: pricing.priceFrom,
      priceValue: pricing.priceCents,
      variants: formatVariants(p, productVariants, autoDiscounts, locale),
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice,
      rating: p.rating ? Number(p.rating) : null,
      tag: category?.slug ?? "",
      badge: p.isBestSeller ? "Bestseller" : undefined,
      image: primaryMedia?.url ?? "",
      hoverImage: hoverMedia?.url ?? null,
      alt: t?.name ?? p.slug,
      categorySlug: category?.slug ?? "",
      stockQty: pricing.stockQty,
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
  variantAxis: VariantAxis | null;
  variants: StoreVariantView[];
}

async function getStoreProductBySlugImpl(slug: string, locale: Locale = "en"): Promise<StoreProductDetailView | null> {
  const [product] = await db
    .select()
    .from(storeProducts)
    .where(and(eq(storeProducts.slug, slug), eq(storeProducts.isActive, true), isNull(storeProducts.deletedAt)))
    .limit(1);
  if (!product) return null;

  const [category, translations, mediaRows, autoDiscounts, variantsByProduct] = await Promise.all([
    db.select().from(storeCategories).where(eq(storeCategories.id, product.categoryId)).limit(1).then((r) => r[0]),
    db.select().from(storeProductTranslations).where(eq(storeProductTranslations.productId, product.id)),
    db
      .select({ url: media.url, isPrimary: storeProductMedia.isPrimary, sortOrder: storeProductMedia.sortOrder })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(eq(storeProductMedia.productId, product.id))
      .orderBy(asc(storeProductMedia.sortOrder)),
    getAutoDiscounts(),
    loadVariants([product.id], locale),
  ]);

  const t = pickTranslation(translations, locale);
  const primaryMedia = mediaRows.find((m) => m.isPrimary) ?? mediaRows[0];
  const variants = variantsByProduct.get(product.id) ?? [];
  const pricing = priceProduct(product, variants, autoDiscounts, locale);

  return {
    id: product.id,
    slug: product.slug,
    name: t?.name ?? product.slug,
    brand: product.brand,
    description: t?.description ?? null,
    notes: t?.notes ?? null,
    hasVariants: pricing.hasVariants,
    priceFrom: pricing.priceFrom,
    priceValue: pricing.priceCents,
    price: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    variantAxis: variants[0]?.axis ?? null,
    variants: formatVariants(product, variants, autoDiscounts, locale),
    rating: product.rating ? Number(product.rating) : null,
    tag: category?.slug ?? "",
    badge: product.isBestSeller ? "Bestseller" : undefined,
    image: primaryMedia?.url ?? "",
    hoverImage: mediaRows.find((m) => m !== primaryMedia)?.url ?? null,
    alt: t?.name ?? product.slug,
    images: mediaRows.map((m) => ({ url: m.url, alt: t?.name ?? product.slug })),
    categorySlug: category?.slug ?? "",
    stockQty: pricing.stockQty,
    isFeaturedHome: product.isFeaturedHome,
    isBestSeller: product.isBestSeller,
  };
}

export const getStoreProductBySlug = unstable_cache(getStoreProductBySlugImpl, ["store-product-by-slug"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});

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

export interface BrandView {
  name: string;
  productCount: number;
  /** A photo from one of the brand's products, for the brand index hover. */
  image: string | null;
}

/** Brands in the live catalog, most products first — derived from the listing so it shares its cache. */
export async function getStoreBrands(locale: Locale = "en"): Promise<BrandView[]> {
  const products = await getStoreProducts(locale);
  const byBrand = new Map<string, BrandView>();
  for (const p of products) {
    if (!p.brand) continue;
    const entry = byBrand.get(p.brand) ?? { name: p.brand, productCount: 0, image: null };
    entry.productCount += 1;
    entry.image ??= p.image || null;
    byBrand.set(p.brand, entry);
  }
  return [...byBrand.values()].sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
}
