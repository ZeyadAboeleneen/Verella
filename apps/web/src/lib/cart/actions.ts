"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db, carts, cartItems, storeProducts, storeProductVariants } from "@verella/db";
import { cartItemInputSchema } from "@verella/core";
import { auth } from "@/auth";
import { ensureGuestCartToken, getGuestCartToken } from "./guest-token";
import type { ActionResult } from "@/lib/auth/rbac";

// The cart badge lives in the (shop) root layout, which wraps every page —
// revalidating the layout refreshes the badge everywhere in one shot.
function revalidateCart() {
  revalidatePath("/", "layout");
}

async function resolveCartId(): Promise<number> {
  const session = await auth();
  if (session?.user) {
    const userId = Number(session.user.id);
    const [existing] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId)).limit(1);
    if (existing) return existing.id;
    const [row] = await db.insert(carts).values({ userId, status: "active" }).$returningId();
    return row.id;
  }
  const token = await ensureGuestCartToken();
  const [existing] = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestToken, token)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(carts).values({ guestToken: token, status: "active" }).$returningId();
  return row.id;
}

/** The current shopper's cart id without creating one — for ownership checks. */
async function currentCartId(): Promise<number | null> {
  const session = await auth();
  if (session?.user) {
    const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, Number(session.user.id))).limit(1);
    return row?.id ?? null;
  }
  const token = await getGuestCartToken();
  if (!token) return null;
  const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestToken, token)).limit(1);
  return row?.id ?? null;
}

/** A cart line, but only if it sits in the current shopper's own cart. */
async function ownLine(cartItemId: number) {
  const cartId = await currentCartId();
  if (!cartId) return null;
  const [line] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.cartId, cartId)))
    .limit(1);
  return line ?? null;
}

/**
 * What the shopper is actually buying — the product itself, or one of its
 * variants — with the price and stock that apply to it. A product that has
 * active variants can't be bought without choosing one.
 */
async function resolvePurchasable(
  storeProductId: number,
  variantId: number | null | undefined,
): Promise<{ error: string } | { price: string; stockQty: number; variantId: number | null }> {
  const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, storeProductId)).limit(1);
  if (!product || !product.isActive || product.deletedAt) return { error: "This product is not available." };

  const activeVariants = await db
    .select()
    .from(storeProductVariants)
    .where(and(eq(storeProductVariants.productId, storeProductId), eq(storeProductVariants.isActive, true)));

  if (activeVariants.length === 0) {
    return { price: product.price, stockQty: product.stockQty, variantId: null };
  }
  if (!variantId) return { error: "Please choose an option first." };
  const variant = activeVariants.find((v) => v.id === variantId);
  if (!variant) return { error: "That option is no longer available." };
  return { price: variant.price, stockQty: variant.stockQty, variantId: variant.id };
}

export async function addToCartAction(storeProductId: number, quantity = 1, variantId?: number): Promise<ActionResult> {
  const parsed = cartItemInputSchema.safeParse({ storeProductId, quantity, variantId });
  if (!parsed.success) return { error: "Invalid request." };

  // A thrown DB error here would surface as an unhandled client-side failure
  // with no feedback — translate everything into an { error } the UI can show.
  try {
    const item = await resolvePurchasable(storeProductId, variantId);
    if ("error" in item) return item;
    if (item.stockQty < quantity) return { error: "Not enough stock available." };

    const cartId = await resolveCartId();
    const [existingLine] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.storeProductId, storeProductId),
          item.variantId ? eq(cartItems.variantId, item.variantId) : isNull(cartItems.variantId),
        ),
      )
      .limit(1);

    if (existingLine) {
      const newQty = existingLine.quantity + quantity;
      if (newQty > item.stockQty) return { error: "Not enough stock available." };
      await db.update(cartItems).set({ quantity: newQty }).where(eq(cartItems.id, existingLine.id));
    } else {
      await db
        .insert(cartItems)
        .values({ cartId, storeProductId, variantId: item.variantId, quantity, unitPriceSnapshot: item.price });
    }
  } catch (err) {
    console.error("addToCartAction failed:", err);
    return { error: "Couldn't add to cart — please try again." };
  }

  revalidateCart();
  return { success: true };
}

export async function updateCartItemQuantityAction(cartItemId: number, quantity: number): Promise<ActionResult> {
  if (quantity < 1) return removeCartItemAction(cartItemId);

  const line = await ownLine(cartItemId);
  if (!line) return { error: "Item not found." };

  const item = await resolvePurchasable(line.storeProductId, line.variantId);
  if ("error" in item) return { error: "This item is no longer available." };
  if (quantity > item.stockQty) return { error: "Not enough stock available." };

  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, cartItemId));
  revalidateCart();
  return { success: true };
}

export async function removeCartItemAction(cartItemId: number): Promise<ActionResult> {
  const line = await ownLine(cartItemId);
  if (!line) return { error: "Item not found." };
  await db.delete(cartItems).where(eq(cartItems.id, line.id));
  revalidateCart();
  return { success: true };
}
