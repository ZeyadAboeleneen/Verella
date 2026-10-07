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
import { formatMoney, governorateLabel, toCents } from "@verella/core";
import { Mail, MapPin, MessageCircle, Phone, Store, Truck } from "lucide-react";
import { normalizeEgyptianPhone } from "@/lib/whatsapp/phone";
import { CopyButton } from "@/components/admin/orders/copy-button";
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
  const customerEmail = guestContact?.email || account?.email || null;

  // WhatsApp chat link (Egyptian numbers → international form).
  const intlPhone = normalizeEgyptianPhone(customerPhone);
  const whatsappHref = intlPhone ? `https://wa.me/${intlPhone}` : null;

  // Full delivery address, labelled, for the courier.
  const a = address[0];
  const govName = a?.governorate ? governorateLabel(a.governorate, "en") : null;
  const addressRows: [string, string][] = a
    ? (
        [
          ["Recipient", a.recipientName && a.recipientName !== customerName ? a.recipientName : null],
          ["Phone", a.phone && a.phone !== customerPhone ? a.phone : null],
          ["Street", a.street],
          ["Building", a.building],
          ["Floor", a.floor],
          ["Apartment", a.apartment],
          ["Area", a.area],
          ["City", a.city],
          ["Governorate", govName],
          ["Landmark", a.landmark],
        ] as [string, string | null | undefined][]
      ).filter((r): r is [string, string] => Boolean(r[1]))
    : [];
  const addressText = a
    ? [
        a.recipientName,
        a.phone,
        [a.street, a.building && `Bldg ${a.building}`, a.floor && `Floor ${a.floor}`, a.apartment && `Apt ${a.apartment}`].filter(Boolean).join(", "),
        [a.area, a.city, govName].filter(Boolean).join(", "),
        a.landmark && `Landmark: ${a.landmark}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const mapsQuery = a ? [a.street, a.building, a.area, a.city, govName, "Egypt"].filter(Boolean).join(", ") : "";

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
              <h2 className="mb-4 font-display text-base font-bold text-on-surface">Customer</h2>

              {/* Who */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-base font-bold text-on-surface">
                  {customerName.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  {order.customerId ? (
                    <Link href={`/admin/customers/${order.customerId}`} className="block truncate text-sm font-semibold text-on-surface hover:underline">
                      {customerName}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-on-surface">{customerName}</p>
                  )}
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      order.customerId ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {order.customerId ? "Registered customer" : "Guest checkout"}
                  </span>
                </div>
              </div>

              {/* Contact */}
              {(customerPhone || customerEmail) && (
                <div className="mt-4 space-y-2 border-t border-outline-variant/60 pt-4 text-sm">
                  {customerPhone && (
                    <div className="flex items-center justify-between gap-2">
                      <a href={`tel:${customerPhone}`} className="inline-flex items-center gap-2 text-on-surface hover:underline" dir="ltr">
                        <Phone size={14} className="text-on-surface-variant" aria-hidden="true" />
                        {customerPhone}
                      </a>
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-[#E7F7EE] px-2.5 py-1 text-xs font-medium text-[#1B7A44] hover:bg-[#D3F0DF]"
                        >
                          <MessageCircle size={12} aria-hidden="true" /> WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                  {customerEmail && (
                    <a href={`mailto:${customerEmail}`} className="flex items-center gap-2 break-all text-on-surface hover:underline">
                      <Mail size={14} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
                      {customerEmail}
                    </a>
                  )}
                </div>
              )}

              {/* Fulfilment */}
              <div className="mt-4 border-t border-outline-variant/60 pt-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {order.fulfillmentType === "pickup" ? <Store size={13} aria-hidden="true" /> : <Truck size={13} aria-hidden="true" />}
                  {order.fulfillmentType === "pickup" ? "Pickup from the store" : "Delivery address"}
                </p>
                {order.fulfillmentType === "delivery" && a ? (
                  <>
                    <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-sm">
                      {addressRows.map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-on-surface-variant">{label}</dt>
                          <dd className="break-words text-on-surface">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton text={addressText} label="Copy address" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
                      >
                        <MapPin size={13} aria-hidden="true" /> Open in Google Maps
                      </a>
                    </div>
                  </>
                ) : order.fulfillmentType === "delivery" ? (
                  <p className="text-sm text-on-surface-variant">No address saved for this order.</p>
                ) : null}
              </div>
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
