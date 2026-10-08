import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { formatMoney, governorateLabel, toCents, WALLET_PAYMENT_METHODS, type PaymentMethodCode } from "@verella/core";
import { getOrderDetail } from "@/lib/orders/queries";
import { getDict, getLocale } from "@/lib/i18n";
import { OrderConfirmation } from "@/components/order/OrderConfirmation";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.order.title);
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [detail, dict, locale] = await Promise.all([getOrderDetail(orderNumber), getDict(), getLocale()]);
  if (!detail) notFound();

  const { order, items, payment, address } = detail;
  const money = (value: string) => formatMoney(toCents(value), "EGP", locale);
  const methodCode = payment?.methodCode as PaymentMethodCode | undefined;
  const isWallet = !!methodCode && WALLET_PAYMENT_METHODS.includes(methodCode);

  return (
    <OrderConfirmation
      orderNumber={order.orderNumber}
      status={order.status}
      fulfillmentType={order.fulfillmentType}
      items={items.map((item) => ({
        id: item.id,
        nameSnapshot: item.nameSnapshot,
        variantLabelSnapshot: item.variantLabelSnapshot,
        quantity: item.quantity,
        lineTotalFormatted: money(item.lineTotal),
      }))}
      subtotalFormatted={money(order.subtotal)}
      discountFormatted={Number(order.discountTotal) > 0 ? money(order.discountTotal) : null}
      deliveryFeeFormatted={
        order.fulfillmentType === "delivery" ? (Number(order.deliveryFee) === 0 ? dict.cart.freeDelivery : money(order.deliveryFee)) : null
      }
      totalFormatted={money(order.grandTotal)}
      deposit={
        methodCode === "cash_on_delivery" && Number(order.depositAmount) > 0
          ? {
              amountFormatted: money(order.depositAmount),
              dueFormatted: money((Number(order.grandTotal) - Number(order.depositAmount)).toFixed(2)),
              awaiting: order.status === "pending",
            }
          : null
      }
      paymentMethodLabel={methodCode ? (dict.checkout.methods[methodCode]?.label ?? payment?.methodName ?? null) : null}
      deliverToValue={
        address ? [address.area, governorateLabel(address.governorate, locale)].filter(Boolean).join(locale === "ar" ? "، " : ", ") : null
      }
      showWalletUpload={isWallet && payment?.status === "pending"}
      showWalletSubmitted={isWallet && payment?.status === "submitted"}
      walletHint={dict.checkout.wallet.proofHint}
      dict={dict}
    />
  );
}
