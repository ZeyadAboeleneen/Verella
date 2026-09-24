import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { Check, MessageCircle, XCircle } from "lucide-react";
import { formatMoney, governorateLabel, toCents, WALLET_PAYMENT_METHODS, type PaymentMethodCode } from "@verella/core";
import type { OrderStatus } from "@verella/db";
import { getOrderDetail } from "@/lib/orders/queries";
import { getDict, getLocale, type Dictionary } from "@/lib/i18n";
import { BRAND_CONTACT } from "@/lib/brand";
import { InstapayUpload } from "@/components/checkout/instapay-upload";
import { VMark } from "@/components/brand/Logo";

const DELIVERY_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "completed"];
const PICKUP_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup", "completed"];

function StatusTimeline({
  status,
  fulfillmentType,
  labels,
}: {
  status: OrderStatus;
  fulfillmentType: string;
  labels: Dictionary["order"];
}) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-error-container/40 p-5 text-sm text-on-error-container">
        <XCircle size={18} /> {labels.cancelled}
      </div>
    );
  }

  const pickup = fulfillmentType === "pickup";
  const flow = pickup ? PICKUP_FLOW : DELIVERY_FLOW;
  const currentIndex = Math.max(0, flow.indexOf(status));
  const stepLabel = (s: OrderStatus) =>
    s === "completed" && pickup ? labels.steps.pickedUp : labels.steps[s as keyof typeof labels.steps];

  return (
    <ol className="flex items-start rounded-2xl bg-surface-container-lowest px-3 py-6">
      {flow.map((step, i) => {
        const reached = i <= currentIndex;
        return (
          <li key={step} className="relative flex-1">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-3 h-px w-full -translate-x-1/2 rtl:translate-x-1/2 ${reached ? "bg-charcoal" : "bg-beige"}`}
              />
            )}
            <div className="relative flex flex-col items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                  reached ? "bg-charcoal text-ivory" : "border border-beige bg-ivory text-on-surface-variant"
                } ${i === currentIndex ? "ring-4 ring-gold/25" : ""}`}
              >
                {reached ? <Check size={12} /> : i + 1}
              </span>
              <span className={`text-center text-[11px] leading-tight ${reached ? "text-charcoal" : "text-on-surface-variant"}`}>
                {stepLabel(step)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.order.title);
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [detail, dict, locale] = await Promise.all([getOrderDetail(orderNumber), getDict(), getLocale()]);
  if (!detail) notFound();

  const { order, items, payment, address } = detail;
  const t = dict.order;
  const money = (value: string) => formatMoney(toCents(value), "EGP", locale);
  const methodCode = payment?.methodCode as PaymentMethodCode | undefined;
  const isWallet = !!methodCode && WALLET_PAYMENT_METHODS.includes(methodCode);

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:py-20">
      <div className="text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-charcoal">
          <VMark size={26} className="text-champagne" />
        </span>
        <h1 className="font-display text-3xl font-medium text-charcoal md:text-4xl">{t.thanks}</h1>
        <p className="mt-3 text-sm text-on-surface-variant">
          {t.number.replace("{number}", "")}
          <span className="font-medium tracking-wider text-charcoal" dir="ltr">
            {order.orderNumber}
          </span>
        </p>
      </div>

      <div className="mt-10">
        <StatusTimeline status={order.status} fulfillmentType={order.fulfillmentType} labels={t} />
      </div>

      {isWallet && payment?.status === "pending" && (
        <div className="mt-6">
          <InstapayUpload orderNumber={order.orderNumber} hint={dict.checkout.wallet.proofHint} />
        </div>
      )}
      {isWallet && payment?.status === "submitted" && (
        <p className="mt-6 rounded-xl bg-secondary-container/50 px-4 py-3 text-center text-sm text-charcoal">{t.proofSubmitted}</p>
      )}

      <div className="mt-6 rounded-2xl bg-surface-container-lowest p-6">
        <ul className="divide-y divide-beige">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 text-sm first:pt-0">
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="text-charcoal">{item.nameSnapshot}</span>
                {item.variantLabelSnapshot && (
                  <span className="text-xs uppercase tracking-wider text-on-surface-variant">{item.variantLabelSnapshot}</span>
                )}
                <span className="text-on-surface-variant">× {item.quantity}</span>
              </span>
              <span className="shrink-0 text-charcoal">{money(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-beige pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">{dict.checkout.subtotal}</dt>
            <dd className="text-charcoal">{money(order.subtotal)}</dd>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">{dict.checkout.discount}</dt>
              <dd className="text-gold-ink">−{money(order.discountTotal)}</dd>
            </div>
          )}
          {order.fulfillmentType === "delivery" && (
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">{dict.checkout.deliveryFee}</dt>
              <dd className="text-charcoal">{money(order.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-beige pt-3">
            <dt className="font-medium text-charcoal">{dict.checkout.total}</dt>
            <dd className="text-xl font-medium text-charcoal">{money(order.grandTotal)}</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-4 border-t border-beige pt-5 text-sm sm:grid-cols-2">
          {methodCode && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{t.payment}</p>
              <p className="mt-1 text-charcoal">{dict.checkout.methods[methodCode]?.label ?? payment?.methodName}</p>
            </div>
          )}
          {address && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{t.deliverTo}</p>
              <p className="mt-1 text-charcoal">
                {[address.area, governorateLabel(address.governorate, locale)].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-on-surface-variant">{t.questions}</p>
        <a
          href={BRAND_CONTACT.whatsapp.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-charcoal px-6 text-xs font-medium uppercase tracking-[0.2em] text-charcoal transition-colors hover:bg-charcoal hover:text-ivory"
        >
          <MessageCircle size={14} /> {t.whatsapp}
        </a>
        <Link href="/store" className="text-xs text-on-surface-variant underline-offset-4 hover:text-charcoal hover:underline">
          {t.continueShopping}
        </Link>
      </div>
    </div>
  );
}
