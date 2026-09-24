import "server-only";
import { eq } from "drizzle-orm";
import { db, orders, orderItems, payments, paymentMethods, customers, addresses } from "@verella/db";
import { auth } from "@/auth";

/**
 * Guest orders are looked up by order number alone (the standard "guest order
 * tracking" pattern — no session exists to check ownership against). This
 * still applies even when the order has a customerId: a guest who checked
 * out with an email gets an account auto-created for them (see
 * resolveOrCreateGuestCustomer in checkout/actions.ts) without ever signing
 * in, so `customerId` alone doesn't mean "requires a session" anymore.
 *
 * Ownership is only enforced when someone IS signed in — a logged-in
 * customer can't browse another customer's order by guessing numbers, but an
 * anonymous visitor can always view an order by its number (same as before
 * guest-to-account auto-creation existed).
 */
export async function getOwnedOrder(orderNumber: string) {
  const session = await auth();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return null;

  if (order.customerId && session?.user) {
    const [customer] = await db.select().from(customers).where(eq(customers.userId, Number(session.user.id))).limit(1);
    if (!customer || customer.id !== order.customerId) return null;
  }
  return order;
}

export async function getOrderDetail(orderNumber: string) {
  const order = await getOwnedOrder(orderNumber);
  if (!order) return null;

  const [items, [payment], [address]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select({ status: payments.status, methodCode: paymentMethods.code, methodName: paymentMethods.name })
      .from(payments)
      .innerJoin(paymentMethods, eq(paymentMethods.id, payments.methodId))
      .where(eq(payments.orderId, order.id))
      .limit(1),
    // Governorate + area only: this page is reachable by order number alone
    // (guest tracking), so it deliberately shows no street-level address.
    order.addressId
      ? db
          .select({ governorate: addresses.governorate, area: addresses.area })
          .from(addresses)
          .where(eq(addresses.id, order.addressId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return { order, items, payment, address: address ?? null };
}
