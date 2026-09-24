import "server-only";
import { and, eq, inArray, isNull, sum } from "drizzle-orm";
import {
  db,
  carts,
  cartItems,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
  storeProductVariants,
  storeProductVariantTranslations,
  media,
} from "@verella/db";
import { auth } from "@/auth";
import { addCents, toCents, type Locale } from "@verella/core";
import { getGuestCartToken } from "./guest-token";

export interface CartLineView {
  id: number;
  productId: number;
  variantId: number | null;
  /** e.g. "100ml" or "M" — null for products sold without variants. */
  variantLabel: string | null;
  sku: string | null;
  slug: string;
  name: string;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  stockQty: number;
  categoryId: number;
}

export interface CartView {
  cartId: number | null;
  lines: CartLineView[];
  subtotalCents: number;
  itemCount: number;
}

async function getCurrentCartId(): Promise<number | null> {
  const session = await auth();
  if (session?.user) {
    const userId = Number(session.user.id);
    const [existing] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId)).limit(1);
    return existing?.id ?? null;
  }
  const token = await getGuestCartToken();
  if (!token) return null;
  const [existing] = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestToken, token)).limit(1);
  return existing?.id ?? null;
}

export async function getCart(locale: Locale = "en"): Promise<CartView> {
  const cartId = await getCurrentCartId();
  if (!cartId) return { cartId: null, lines: [], subtotalCents: 0, itemCount: 0 };

  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  if (items.length === 0) return { cartId, lines: [], subtotalCents: 0, itemCount: 0 };

  const productIds = items.map((i) => i.storeProductId);
  const variantIds = items.map((i) => i.variantId).filter((v): v is number => v != null);
  const [products, translations, mediaRows, variants, variantTranslations] = await Promise.all([
    db.select().from(storeProducts).where(and(inArray(storeProducts.id, productIds), isNull(storeProducts.deletedAt))),
    db.select().from(storeProductTranslations).where(inArray(storeProductTranslations.productId, productIds)),
    db
      .select({ productId: storeProductMedia.productId, url: media.url, isPrimary: storeProductMedia.isPrimary })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(inArray(storeProductMedia.productId, productIds)),
    variantIds.length
      ? db.select().from(storeProductVariants).where(inArray(storeProductVariants.id, variantIds))
      : Promise.resolve([]),
    variantIds.length
      ? db.select().from(storeProductVariantTranslations).where(inArray(storeProductVariantTranslations.variantId, variantIds))
      : Promise.resolve([]),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));

  const lines: CartLineView[] = items.map((item) => {
    const product = productById.get(item.storeProductId);
    const t =
      translations.find((tr) => tr.productId === item.storeProductId && tr.locale === locale) ??
      translations.find((tr) => tr.productId === item.storeProductId && tr.locale === "en");
    const img = mediaRows.find((m) => m.productId === item.storeProductId && m.isPrimary) ?? mediaRows.find((m) => m.productId === item.storeProductId);
    const unitPriceCents = toCents(item.unitPriceSnapshot);
    const variant = item.variantId ? variantById.get(item.variantId) : undefined;
    const variantLabel = variant
      ? (variantTranslations.find((vt) => vt.variantId === variant.id && vt.locale === locale)?.label ?? variant.label)
      : null;

    return {
      id: item.id,
      productId: item.storeProductId,
      variantId: variant?.id ?? null,
      variantLabel,
      sku: variant?.sku ?? product?.sku ?? null,
      slug: product?.slug ?? "",
      name: t?.name ?? product?.slug ?? "Product",
      image: img?.url ?? null,
      unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: unitPriceCents * item.quantity,
      // A deactivated variant can't be bought any more — treat it as sold out.
      stockQty: variant ? (variant.isActive ? variant.stockQty : 0) : (product?.stockQty ?? 0),
      categoryId: product?.categoryId ?? 0,
    };
  });

  return {
    cartId,
    lines,
    subtotalCents: addCents(...lines.map((l) => l.lineTotalCents)),
    itemCount: lines.reduce((total, l) => total + l.quantity, 0),
  };
}

/**
 * Lightweight count for the navbar badge — avoids the full getCart() join
 * (products + translations + media) on every single page load site-wide.
 */
export async function getCartItemCount(): Promise<number> {
  const cartId = await getCurrentCartId();
  if (!cartId) return 0;
  const [row] = await db.select({ total: sum(cartItems.quantity) }).from(cartItems).where(eq(cartItems.cartId, cartId));
  return Number(row?.total ?? 0);
}
