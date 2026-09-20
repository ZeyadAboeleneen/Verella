"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, carts, cartItems, storeProducts } from "@verella/db";
import { cartItemInputSchema } from "@verella/core";
import { auth } from "@/auth";
import { ensureGuestCartToken } from "./guest-token";
import type { ActionResult } from "@/lib/auth/rbac";

// The cart badge lives in the (shop) root layout, which wraps every page —
// revalidating just "/cart"/"/store" left the badge stale when items were
// added from the homepage, menu, or a product detail page. Revalidating the
// layout itself refreshes the badge everywhere in one shot.
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

export async function addToCartAction(storeProductId: number, quantity = 1): Promise<ActionResult> {
  const parsed = cartItemInputSchema.safeParse({ storeProductId, quantity });
  if (!parsed.success) return { error: "Invalid request." };

  // A thrown DB error here would surface as an unhandled client-side failure
  // with no feedback — translate everything into an { error } the UI can show.
  try {
    const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, storeProductId)).limit(1);
    if (!product || !product.isActive || product.deletedAt) return { error: "This product is not available." };
    if (product.stockQty < quantity) return { error: "Not enough stock available." };

    const cartId = await resolveCartId();
    const [existingLine] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.storeProductId, storeProductId)))
      .limit(1);

    if (existingLine) {
      const newQty = existingLine.quantity + quantity;
      if (newQty > product.stockQty) return { error: "Not enough stock available." };
      await db.update(cartItems).set({ quantity: newQty }).where(eq(cartItems.id, existingLine.id));
    } else {
      await db.insert(cartItems).values({ cartId, storeProductId, quantity, unitPriceSnapshot: product.price });
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

  const [line] = await db.select().from(cartItems).where(eq(cartItems.id, cartItemId)).limit(1);
  if (!line) return { error: "Item not found." };

  const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, line.storeProductId)).limit(1);
  if (!product || product.deletedAt) return { error: "This product is no longer available." };
  if (quantity > product.stockQty) return { error: "Not enough stock available." };

  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, cartItemId));
  revalidateCart();
  return { success: true };
}

export async function removeCartItemAction(cartItemId: number): Promise<ActionResult> {
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  revalidateCart();
  return { success: true };
}
