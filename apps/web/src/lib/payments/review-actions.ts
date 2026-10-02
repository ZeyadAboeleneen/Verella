"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, payments, orders, orderStatusHistory } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { triggerOrderWhatsAppInvoice, triggerOrderWhatsAppStatusUpdate } from "@/lib/whatsapp/order-invoice";
import { syncStockForStatusChange } from "@/lib/orders/stock";

export async function reviewPaymentAction(
  paymentId: number,
  decision: "approved" | "rejected",
  notes?: string,
): Promise<ActionResult> {
  const guard = await guardPermission("payments.review");
  if ("error" in guard) return guard;

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return { error: "Payment not found." };

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: decision, reviewedBy: Number(guard.id), reviewedAt: new Date(), notes: notes || null })
      .where(eq(payments.id, paymentId));

    // The order follows the payment decision: approved → confirmed,
    // rejected → cancelled. Only while it's still pending, so an order an
    // admin already moved along by hand is never overwritten.
    const [order] = await tx.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
    if (order && order.status === "pending") {
      const status = decision === "approved" ? "confirmed" : "cancelled";
      await tx.update(orders).set({ status }).where(eq(orders.id, order.id));
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status,
        note: decision === "approved" ? "Payment approved." : `Payment rejected.${notes ? ` ${notes}` : ""}`,
        changedBy: Number(guard.id),
      });
      // A rejected payment's items go back on the shelf.
      await syncStockForStatusChange(tx, order.id, order.status, status);
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: `payment.${decision}`, entityType: "payment", entityId: paymentId });

  // Customer messages (WhatsApp + email, once each, after the response):
  //  approved → the order confirmation (invoice);
  //  rejected → the cancellation message (the order was just cancelled).
  if (decision === "approved") triggerOrderWhatsAppInvoice(payment.orderId);
  else triggerOrderWhatsAppStatusUpdate(payment.orderId, "cancelled");

  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${payment.orderId}`);
  return { success: true };
}
