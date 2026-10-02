"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, orders, orderStatusHistory, type OrderStatus } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { triggerOrderWhatsAppStatusUpdate } from "@/lib/whatsapp/order-invoice";
import { syncStockForStatusChange } from "./stock";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "completed",
  "cancelled",
];

export async function updateOrderStatusAction(orderId: number, status: OrderStatus, note?: string): Promise<ActionResult> {
  const guard = await guardPermission("orders.manage");
  if ("error" in guard) return guard;

  if (!VALID_STATUSES.includes(status)) return { error: "Invalid status." };

  const changed = await db.transaction(async (tx) => {
    const [current] = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!current) return false;
    await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, status, note: note || null, changedBy: Number(guard.id) });
    // Cancelling puts the items back in stock; re-opening a cancelled order takes them again.
    await syncStockForStatusChange(tx, orderId, current.status, status);
    return true;
  });
  if (!changed) return { error: "Order not found." };

  await logActivity({ actorUserId: Number(guard.id), action: "order.status_changed", entityType: "order", entityId: orderId, changes: { status } });

  // WhatsApp: retries the invoice if it hasn't gone out, then sends this
  // status's update to the customer (once per status, after the response).
  triggerOrderWhatsAppStatusUpdate(orderId, status);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
