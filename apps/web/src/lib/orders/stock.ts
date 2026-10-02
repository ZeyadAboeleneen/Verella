import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, orderItems, storeProducts, storeProductVariants, type OrderStatus } from "@verella/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Keep stock in step with an order's status change (call inside the same
 * transaction as the status update):
 *  - into "cancelled"  → its items go back on the shelf;
 *  - out of "cancelled" (an admin re-opens it) → they're taken off again.
 * Any other change leaves stock alone. Stock lives on the variant when the
 * line has one, otherwise on the product; deleted products/variants are skipped.
 */
export async function syncStockForStatusChange(tx: Tx, orderId: number, from: OrderStatus, to: OrderStatus): Promise<void> {
  const cancelling = from !== "cancelled" && to === "cancelled";
  const reopening = from === "cancelled" && to !== "cancelled";
  if (!cancelling && !reopening) return;

  const items = await tx
    .select({ productId: orderItems.storeProductId, variantId: orderItems.variantId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    const delta = cancelling ? item.quantity : -item.quantity;
    if (item.variantId) {
      await tx
        .update(storeProductVariants)
        .set({ stockQty: sql`${storeProductVariants.stockQty} + ${delta}` })
        .where(eq(storeProductVariants.id, item.variantId));
    } else if (item.productId) {
      await tx
        .update(storeProducts)
        .set({ stockQty: sql`${storeProducts.stockQty} + ${delta}` })
        .where(eq(storeProducts.id, item.productId));
    }
  }
}
