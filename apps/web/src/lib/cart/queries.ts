import "server-only";
import { and, eq, inArray, isNull, sum } from "drizzle-orm";
import { db, carts, cartItems, storeProducts, storeProductTranslations, storeProductMedia, media } from "@verella/db";
import { auth } from "@/auth";
import { addCents, toCents, type Locale } from "@verella/core";
import { getGuestCartToken } from "./guest-token";

export interface CartLineView {
  id: number;
  productId: number;
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
  const [products, translations, mediaRows] = await Promise.all([
    db.select().from(storeProducts).where(and(inArray(storeProducts.id, productIds), isNull(storeProducts.deletedAt))),
    db.select().from(storeProductTranslations).where(inArray(storeProductTranslations.productId, productIds)),
    db
      .select({ productId: storeProductMedia.productId, url: media.url, isPrimary: storeProductMedia.isPrimary })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(inArray(storeProductMedia.productId, productIds)),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: CartLineView[] = items.map((item) => {
    const product = productById.get(item.storeProductId);
    const t =
      translations.find((tr) => tr.productId === item.storeProductId && tr.locale === locale) ??
      translations.find((tr) => tr.productId === item.storeProductId && tr.locale === "en");
    const img = mediaRows.find((m) => m.productId === item.storeProductId && m.isPrimary) ?? mediaRows.find((m) => m.productId === item.storeProductId);
    const unitPriceCents = toCents(item.unitPriceSnapshot);

    return {
      id: item.id,
      productId: item.storeProductId,
      slug: product?.slug ?? "",
      name: t?.name ?? product?.slug ?? "Product",
      image: img?.url ?? null,
      unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: unitPriceCents * item.quantity,
      stockQty: product?.stockQty ?? 0,
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
