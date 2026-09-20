"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, payments, orders, orderStatusHistory, customers, users } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { sendEmail } from "@/lib/email/mailer";

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

    if (decision === "approved") {
      const [order] = await tx.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
      if (order && order.status === "pending") {
        await tx.update(orders).set({ status: "confirmed" }).where(eq(orders.id, order.id));
        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: "confirmed",
          note: "Payment approved.",
          changedBy: Number(guard.id),
        });
      }
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: `payment.${decision}`, entityType: "payment", entityId: paymentId });

  const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
  if (order) {
    let recipientEmail: string | null = null;
    let recipientName = "there";
    if (order.customerId) {
      const [row] = await db
        .select({ email: users.email, fullName: users.fullName })
        .from(customers)
        .innerJoin(users, eq(users.id, customers.userId))
        .where(eq(customers.id, order.customerId))
        .limit(1);
      if (row) {
        recipientEmail = row.email;
        recipientName = row.fullName;
      }
    } else if (order.guestContact && typeof order.guestContact === "object") {
      const contact = order.guestContact as { name?: string; email?: string };
      recipientEmail = contact.email ?? null;
      recipientName = contact.name ?? recipientName;
    }

    if (recipientEmail) {
      const approved = decision === "approved";
      const subject = approved ? `Payment confirmed — ${order.orderNumber}` : `Payment issue — ${order.orderNumber}`;
      const message = approved
        ? `Great news — we've confirmed your InstaPay payment for order ${order.orderNumber}. Your order is now being prepared.`
        : `We were unable to confirm your InstaPay payment for order ${order.orderNumber}.${notes ? ` Note: ${notes}` : ""} Please contact us so we can help sort this out.`;
      await sendEmail({
        to: recipientEmail,
        subject,
        text: `Hello ${recipientName},\n\n${message}`,
        html: `<p>Hello ${recipientName},</p><p>${message}</p>`,
      });
    }
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/orders/${payment.orderId}`);
  return { success: true };
}
