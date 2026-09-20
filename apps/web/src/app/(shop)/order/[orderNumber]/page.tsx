import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatMoney, toCents } from "@verella/core";
import type { OrderStatus } from "@verella/db";
import { getOrderDetail } from "@/lib/orders/queries";
import { getDict } from "@/lib/i18n";
import { InstapayUpload } from "@/components/checkout/instapay-upload";

const DELIVERY_FLOW: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "out_for_delivery", label: "On its way" },
  { status: "completed", label: "Delivered" },
];

const PICKUP_FLOW: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "preparing", label: "Preparing" },
  { status: "ready_for_pickup", label: "Ready for pickup" },
  { status: "completed", label: "Picked up" },
];

function StatusTimeline({ status, fulfillmentType }: { status: OrderStatus; fulfillmentType: string }) {
  if (status === "cancelled") {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 text-sm font-semibold text-error">
        <XCircle size={18} /> This order was cancelled.
      </div>
    );
  }

  const flow = fulfillmentType === "pickup" ? PICKUP_FLOW : DELIVERY_FLOW;
  const currentIndex = Math.max(0, flow.findIndex((s) => s.status === status));

  return (
    <div className="mt-8 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5">
      <ol className="flex items-start">
        {flow.map((step, i) => {
          const reached = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={step.status} className="relative flex-1">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-3 h-0.5 w-full -translate-x-1/2 ${i <= currentIndex ? "bg-primary" : "bg-outline-variant/60"}`}
                />
              )}
              <div className="relative flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    reached ? "bg-primary text-on-primary" : "border border-outline-variant bg-surface text-on-surface-variant"
                  } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                >
                  {reached ? "✓" : i + 1}
                </span>
                <span className={`text-center text-[11px] leading-tight ${reached ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [detail, dict] = await Promise.all([getOrderDetail(orderNumber), getDict()]);
  if (!detail) notFound();

  const { order, items, payment } = detail;

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center md:px-0">
      <CheckCircle2 size={48} className="mx-auto mb-4 text-secondary" />
      <h1 className="font-display text-2xl font-bold text-on-surface">Thank you for your order!</h1>
      <p className="mt-2 text-on-surface-variant">
        Order <span className="font-mono font-semibold">{order.orderNumber}</span> has been placed.
      </p>

      <StatusTimeline status={order.status} fulfillmentType={order.fulfillmentType} />

      <div className="mt-6 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-start">
        <div className="space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-on-surface-variant">
              <span>
                {item.nameSnapshot} × {item.quantity}
              </span>
              <span>{formatMoney(toCents(item.lineTotal))}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-outline-variant/60 pt-4 text-sm">
          <div className="flex justify-between text-on-surface-variant">
            <span>{dict.checkout.deliveryFee}</span>
            <span>{formatMoney(toCents(order.deliveryFee))}</span>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <span>{dict.checkout.discount}</span>
              <span>-{formatMoney(toCents(order.discountTotal))}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-on-surface">
            <span>{dict.checkout.total}</span>
            <span>{formatMoney(toCents(order.grandTotal))}</span>
          </div>
        </div>
      </div>

      {payment?.methodCode === "instapay" && payment.status === "pending" && (
        <div className="mt-6">
          <InstapayUpload orderNumber={order.orderNumber} hint={dict.checkout.instapayUploadHint} />
        </div>
      )}
      {payment?.methodCode === "instapay" && payment.status === "submitted" && (
        <p className="mt-6 text-sm text-on-surface-variant">
          Your payment proof was submitted and is awaiting review. We&apos;ll confirm your order shortly.
        </p>
      )}
    </div>
  );
}
