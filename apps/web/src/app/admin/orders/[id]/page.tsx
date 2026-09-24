import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  payments,
  paymentMethods,
  addresses,
  customers,
  users,
} from "@verella/db";
import { formatMoney, toCents } from "@verella/core";
import { Card, CardContent } from "@/components/ui/card";
import { StatusUpdater } from "@/components/admin/orders/status-updater";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) notFound();

  const [items, history, paymentRows, address, customerAccount] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt)),
    db
      .select({
        id: payments.id,
        status: payments.status,
        amount: payments.amount,
        methodName: paymentMethods.name,
        proofMediaId: payments.proofMediaId,
      })
      .from(payments)
      .innerJoin(paymentMethods, eq(paymentMethods.id, payments.methodId))
      .where(eq(payments.orderId, orderId)),
    order.addressId ? db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1) : Promise.resolve([]),
    order.customerId
      ? db
          .select({ fullName: users.fullName, email: users.email, phone: users.phone })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.userId))
          .where(eq(customers.id, order.customerId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const guestContact = order.guestContact as { name?: string; phone?: string; email?: string } | null;
  const account = customerAccount[0];
  // guestContact (who to actually hand a Pickup order to / contact) takes
  // priority over the account's own details when both exist, since it may
  // deliberately differ (e.g. ordering for someone else).
  const customerName = guestContact?.name ?? account?.fullName ?? "Guest";
  const customerPhone = guestContact?.phone ?? account?.phone ?? null;
  const customerEmail = guestContact?.email ?? account?.email ?? null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">Order {order.orderNumber}</h1>
          <p className="text-sm text-on-surface-variant">Placed {new Date(order.placedAt).toLocaleString()}</p>
        </div>
        <StatusUpdater orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="mb-4 font-display text-lg font-bold text-on-surface">Items</h2>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-on-surface">
                  <span>
                    {item.nameSnapshot}
                    {item.variantLabelSnapshot && (
                      <span className="ms-2 rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                        {item.variantLabelSnapshot}
                      </span>
                    )}{" "}
                    × {item.quantity}
                    {item.skuSnapshot && <span className="ms-2 text-xs text-on-surface-variant">SKU {item.skuSnapshot}</span>}
                  </span>
                  <span>{formatMoney(toCents(item.lineTotal))}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 border-t border-outline-variant/60 pt-4 text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span>{formatMoney(toCents(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Discount</span>
                <span>-{formatMoney(toCents(order.discountTotal))}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Delivery fee</span>
                <span>{formatMoney(toCents(order.deliveryFee))}</span>
              </div>
              <div className="flex justify-between font-semibold text-on-surface">
                <span>Total</span>
                <span>{formatMoney(toCents(order.grandTotal))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent>
              <h2 className="mb-3 font-display text-base font-bold text-on-surface">Customer</h2>
              {order.customerId ? (
                <Link href={`/admin/customers/${order.customerId}`} className="text-sm font-semibold text-primary hover:underline">
                  {customerName}
                </Link>
              ) : (
                <p className="text-sm text-on-surface">{customerName}</p>
              )}
              <p className="mt-0.5 text-xs uppercase tracking-wide text-on-surface-variant">
                {order.customerId ? "Registered customer" : "Guest checkout"}
              </p>
              {customerPhone && <p className="mt-2 text-sm text-on-surface-variant">{customerPhone}</p>}
              {customerEmail && <p className="text-sm text-on-surface-variant">{customerEmail}</p>}
              {address[0] && (
                <p className="mt-2 text-sm text-on-surface-variant">
                  {[address[0].street, address[0].building, address[0].area, address[0].city, address[0].governorate]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="mb-3 font-display text-base font-bold text-on-surface">Payment</h2>
              {paymentRows.map((p) => (
                <div key={p.id} className="text-sm">
                  <p className="text-on-surface">{p.methodName}</p>
                  <p className="text-on-surface-variant capitalize">{p.status}</p>
                  {p.proofMediaId && (
                    <a href={`/admin/payments`} className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
                      Review in Payments
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="mb-3 font-display text-base font-bold text-on-surface">Status history</h2>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="text-xs text-on-surface-variant">
                    <span className="font-semibold capitalize text-on-surface">{h.status.replace(/_/g, " ")}</span> —{" "}
                    {new Date(h.createdAt).toLocaleString()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
