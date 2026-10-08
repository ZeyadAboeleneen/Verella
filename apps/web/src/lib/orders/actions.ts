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

/**
 * `depositDecision` — only when cancelling an order whose cash-on-delivery
 * deposit was already paid: "refund" (give it back) or "keep" (still counts as revenue).
 */
export async function updateOrderStatusAction(
  orderId: number,
  status: OrderStatus,
  note?: string,
  depositDecision?: "refund" | "keep",
): Promise<ActionResult> {
  const guard = await guardPermission("orders.manage");
  if ("error" in guard) return guard;

  if (!VALID_STATUSES.includes(status)) return { error: "Invalid status." };

  const changed = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: orders.status, depositAmount: orders.depositAmount })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!current) return "not_found" as const;
    // A paid deposit = the order had a deposit and was past "pending" (an admin confirmed it).
    const depositPaid = Number(current.depositAmount) > 0 && current.status !== "pending" && current.status !== "cancelled";
    if (status === "cancelled" && depositPaid && !depositDecision) return "needs_decision" as const;
    const depositKept = status === "cancelled" && depositPaid && depositDecision === "keep";
    await tx.update(orders).set({ status, depositKept }).where(eq(orders.id, orderId));
    const depositNote =
      status === "cancelled" && depositPaid ? (depositDecision === "keep" ? "Deposit kept (not refunded)." : "Deposit refunded.") : null;
    await tx
      .insert(orderStatusHistory)
      .values({ orderId, status, note: [note, depositNote].filter(Boolean).join(" ") || null, changedBy: Number(guard.id) });
    // Cancelling puts the items back in stock; re-opening a cancelled order takes them again.
    await syncStockForStatusChange(tx, orderId, current.status, status);
    return "ok" as const;
  });
  if (changed === "not_found") return { error: "Order not found." };
  if (changed === "needs_decision") return { error: "Choose whether to refund or keep the deposit." };

  await logActivity({ actorUserId: Number(guard.id), action: "order.status_changed", entityType: "order", entityId: orderId, changes: { status, ...(depositDecision && { depositDecision }) } });

  // WhatsApp: retries the invoice if it hasn't gone out, then sends this
  // status's update to the customer (once per status, after the response).
  triggerOrderWhatsAppStatusUpdate(orderId, status, { depositRefunded: status === "cancelled" && depositDecision === "refund" });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
