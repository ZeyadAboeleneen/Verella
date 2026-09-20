"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, orders, orderStatusHistory, type OrderStatus } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";

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

  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, status, note: note || null, changedBy: Number(guard.id) });
  });

  await logActivity({ actorUserId: Number(guard.id), action: "order.status_changed", entityType: "order", entityId: orderId, changes: { status } });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
