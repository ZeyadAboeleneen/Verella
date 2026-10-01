/**
 * WhatsApp order invoice — eligibility rules and message text.
 *
 * Pure functions only (no database, no network) so the offline test script
 * can exercise exactly the logic production uses.
 */
import { formatMoney, governorateLabel, toCents, WALLET_PAYMENT_METHODS, type PaymentMethodCode } from "@verella/core";
import type { NotificationStatus, OrderStatus, PaymentStatus } from "@verella/db";
import ar from "@/lib/i18n/dictionaries/ar.json";
import en from "@/lib/i18n/dictionaries/en.json";
import { isValidEgyptianPhone } from "./phone";

export type InvoiceIneligibleReason =
  | "already_sent"
  | "order_cancelled"
  | "payment_not_confirmed"
  | "unsupported_payment_method"
  | "invalid_phone";

export type InvoiceEligibility = { eligible: true } | { eligible: false; reason: InvoiceIneligibleReason };

export interface InvoiceEligibilityInput {
  orderStatus: OrderStatus;
  paymentMethodCode: string | null;
  paymentStatus: PaymentStatus | null;
  phone: string | null;
  /** Status of this order's existing WhatsApp invoice notification, if any. */
  invoiceStatus: NotificationStatus | null;
}

/**
 * When may the automatic invoice go out?
 *  - Cash on delivery: as soon as the order exists (no payment step to wait for).
 *  - InstaPay / Vodafone Cash: only after an admin has approved the transfer —
 *    approval sets payment "approved" and moves the order past "pending".
 *  - Never twice, never for a cancelled order, never to a malformed number.
 */
export function checkInvoiceEligibility(input: InvoiceEligibilityInput): InvoiceEligibility {
  if (input.invoiceStatus === "sent") return { eligible: false, reason: "already_sent" };
  if (input.orderStatus === "cancelled") return { eligible: false, reason: "order_cancelled" };

  const method = input.paymentMethodCode;
  if (method === "cash_on_delivery") {
    // eligible — COD has no payment confirmation step
  } else if (method && WALLET_PAYMENT_METHODS.includes(method as PaymentMethodCode)) {
    if (input.paymentStatus !== "approved" || input.orderStatus === "pending") {
      return { eligible: false, reason: "payment_not_confirmed" };
    }
  } else {
    return { eligible: false, reason: "unsupported_payment_method" };
  }

  if (!isValidEgyptianPhone(input.phone)) return { eligible: false, reason: "invalid_phone" };
  return { eligible: true };
}

export interface InvoiceData {
  orderNumber: string;
  customerName?: string | null;
  fulfillmentType: "delivery" | "pickup";
  items: { name: string; variant?: string | null; quantity: number; lineTotal: string }[];
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  grandTotal: string;
  paymentMethodCode: string;
  address?: {
    street: string;
    building?: string | null;
    floor?: string | null;
    apartment?: string | null;
    area?: string | null;
    city?: string | null;
    governorate: string;
    landmark?: string | null;
  } | null;
  /** Public order-tracking page. */
  trackingUrl?: string | null;
  /** One-time "create your password" link, when the order's account has no password yet. */
  accountSetupUrl?: string | null;
  /** What they will sign in with afterwards: their email or mobile number. */
  accountLogin?: string | null;
  storeName?: string;
  /** Language the order was placed in. Default: Arabic. */
  locale?: MessageLocale;
}

/** Customer messages follow the site language the order was placed in. */
export type MessageLocale = "ar" | "en";

const money = (value: string, locale: MessageLocale = "ar") => formatMoney(toCents(value), "EGP", locale);
const sep = (locale: MessageLocale) => (locale === "ar" ? "، " : ", ");
const defaultStore = (locale: MessageLocale) => (locale === "ar" ? "ڤيريلا" : "Verella");

/** Same labels the checkout page shows ("الدفع عند الاستلام" / "Cash on delivery", …). */
export function paymentMethodLabel(code: string, locale: MessageLocale = "ar"): string {
  const methods = (locale === "en" ? en : ar).checkout.methods as Record<string, { label: string } | undefined>;
  return methods[code]?.label ?? code;
}

function formatAddress(a: NonNullable<InvoiceData["address"]>, locale: MessageLocale = "ar"): string {
  const L = locale === "ar" ? { building: "عمارة", floor: "الدور", apt: "شقة", landmark: "علامة مميزة" } : { building: "Building", floor: "Floor", apt: "Apt", landmark: "Landmark" };
  const line1 = [
    a.street,
    a.building && `${L.building} ${a.building}`,
    a.floor && `${L.floor} ${a.floor}`,
    a.apartment && `${L.apt} ${a.apartment}`,
  ].filter(Boolean);
  const line2 = [a.area, a.city, governorateLabel(a.governorate, locale)].filter(Boolean);
  return [line1.join(sep(locale)), line2.join(sep(locale)), a.landmark && `${L.landmark}: ${a.landmark}`].filter(Boolean).join("\n");
}

export interface AdminNewOrderData {
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  fulfillmentType: "delivery" | "pickup";
  items: InvoiceData["items"];
  grandTotal: string;
  paymentMethodCode: string;
  governorate?: string | null;
  area?: string | null;
  adminUrl: string;
}

/** Store-owner alert for a new website order. */
export function buildAdminNewOrderMessage(d: AdminNewOrderData): string {
  const isWallet = WALLET_PAYMENT_METHODS.includes(d.paymentMethodCode as PaymentMethodCode);
  const lines = ["🛍️ طلب جديد من الموقع", "", `رقم الطلب: #${d.orderNumber}`];
  if (d.customerName?.trim()) lines.push(`العميل: ${d.customerName.trim()}`);
  if (d.customerPhone?.trim()) lines.push(`الموبايل: ${d.customerPhone.trim()}`);

  lines.push("", "المنتجات:");
  for (const item of d.items) {
    const variant = item.variant ? ` (${item.variant})` : "";
    lines.push(`- ${item.name}${variant} × ${item.quantity} — ${money(item.lineTotal)}`);
  }
  lines.push("", `الإجمالي: ${money(d.grandTotal)}`);
  lines.push(`الدفع: ${paymentMethodLabel(d.paymentMethodCode)}${isWallet ? " — بانتظار مراجعة التحويل" : ""}`);
  if (d.fulfillmentType === "pickup") lines.push("الاستلام: من الفرع");
  else {
    const where = [d.area, d.governorate && governorateLabel(d.governorate, "ar")].filter(Boolean).join("، ");
    lines.push(`التوصيل: ${where || "—"}`);
  }
  lines.push("", `افتح الطلب: ${d.adminUrl}`);
  return lines.join("\n");
}

/** Order statuses that trigger a WhatsApp update ("confirmed" is covered by the invoice itself). */
export const NOTIFIED_STATUSES = ["preparing", "out_for_delivery", "ready_for_pickup", "completed", "cancelled"] as const;
export type NotifiedStatus = (typeof NOTIFIED_STATUSES)[number];

export function isNotifiedStatus(status: string): status is NotifiedStatus {
  return (NOTIFIED_STATUSES as readonly string[]).includes(status);
}

export interface StatusMessageData {
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "delivery" | "pickup";
  paymentMethodCode: string;
  grandTotal: string;
  customerName?: string | null;
  trackingUrl?: string | null;
  storeName?: string;
  /** Language the order was placed in. Default: Arabic. */
  locale?: MessageLocale;
}

/** Status-update message in the order's language, or null for statuses that don't notify the customer. */
export function buildOrderStatusMessage(d: StatusMessageData): string | null {
  if (!isNotifiedStatus(d.status)) return null;
  const locale = d.locale ?? "ar";
  const store = d.storeName ?? defaultStore(locale);
  const n = `#${d.orderNumber}`;
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const name = d.customerName?.trim();
  const due = money(d.grandTotal, locale);
  const pickup = d.fulfillmentType === "pickup";

  const T =
    locale === "ar"
      ? {
          greeting: name ? `أهلاً ${name}،\n` : "",
          preparing: `طلبك ${n} بيتجهز دلوقتي 📦`,
          out_for_delivery: `طلبك ${n} خرج للتوصيل 🚚\nالمندوب هيتواصل معاك قريب.` + (isCod ? `\nالمطلوب عند الاستلام: ${due}` : ""),
          ready_for_pickup: `طلبك ${n} جاهز للاستلام من الفرع ✅`,
          completed: pickup ? `تم استلام طلبك ${n} بنجاح ✅` : `تم توصيل طلبك ${n} بنجاح ✅\nنتمنى المنتجات تعجبك ❤️`,
          cancelled: `تم إلغاء طلبك ${n}.\nلو عندك أي استفسار، كلّمنا على الرقم ده.`,
          track: "تابع طلبك",
        }
      : {
          greeting: name ? `Hi ${name},\n` : "",
          preparing: `Your order ${n} is being prepared 📦`,
          out_for_delivery: `Your order ${n} is out for delivery 🚚\nThe courier will contact you soon.` + (isCod ? `\nAmount due on delivery: ${due}` : ""),
          ready_for_pickup: `Your order ${n} is ready for pickup at the store ✅`,
          completed: pickup ? `Your order ${n} has been picked up ✅` : `Your order ${n} has been delivered ✅\nWe hope you love it ❤️`,
          cancelled: `Your order ${n} has been cancelled.\nIf you have any questions, just reply to this number.`,
          track: "Track your order",
        };

  const lines = [T.greeting + T[d.status]];
  if (d.trackingUrl && d.status !== "cancelled") lines.push("", `${T.track}: ${d.trackingUrl}`);
  lines.push("", `${store} ❤️`);
  return lines.join("\n");
}

/** The WhatsApp invoice, in the order's language. Built only from the order's own snapshot data. */
export function buildOrderInvoiceMessage(d: InvoiceData): string {
  const locale = d.locale ?? "ar";
  const store = d.storeName ?? defaultStore(locale);
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const m = (v: string) => money(v, locale);
  const T =
    locale === "ar"
      ? {
          confirmed: "تم تأكيد طلبك بنجاح ❤️",
          hello: (x: string) => `أهلاً ${x}،`,
          orderNo: "رقم الطلب",
          items: "المنتجات:",
          subtotal: "المجموع الفرعي",
          discount: "الخصم",
          delivery: "التوصيل",
          total: "الإجمالي",
          payment: "طريقة الدفع",
          due: "المطلوب عند الاستلام",
          paid: "تم استلام الدفع ✅",
          address: "العنوان:",
          pickup: "الاستلام: من الفرع",
          track: "تابع طلبك",
          accountSaved: "👤 طلبك اتحفظ في حساب باسمك.",
          accountCta: "اعمل كلمة المرور بتاعتك من اللينك ده، وبعدها تتابع طلباتك وتشوف القديمة كمان:",
          accountLogin: "هتسجّل دخول بـ",
          accountNote: "(اللينك يشتغل مرة واحدة وصالح 30 يوم)",
          thanks: `شكراً لطلبك من ${store} ❤️`,
        }
      : {
          confirmed: "Your order is confirmed ❤️",
          hello: (x: string) => `Hi ${x},`,
          orderNo: "Order number",
          items: "Items:",
          subtotal: "Subtotal",
          discount: "Discount",
          delivery: "Delivery",
          total: "Total",
          payment: "Payment method",
          due: "Amount due on delivery",
          paid: "Payment received ✅",
          address: "Address:",
          pickup: "Pickup: from the store",
          track: "Track your order",
          accountSaved: "👤 Your order is saved to an account in your name.",
          accountCta: "Create your password with this link to follow your orders and see your past ones too:",
          accountLogin: "You'll sign in with",
          accountNote: "(The link works once and is valid for 30 days)",
          thanks: `Thank you for ordering from ${store} ❤️`,
        };

  const lines: string[] = [T.confirmed];
  if (d.customerName?.trim()) lines.push(T.hello(d.customerName.trim()));
  lines.push("", `${T.orderNo}: #${d.orderNumber}`, "", T.items);
  for (const item of d.items) {
    const variant = item.variant ? ` (${item.variant})` : "";
    lines.push(`- ${item.name}${variant} × ${item.quantity} — ${m(item.lineTotal)}`);
  }

  lines.push("", `${T.subtotal}: ${m(d.subtotal)}`);
  if (Number(d.discountTotal) > 0) lines.push(`${T.discount}: −${m(d.discountTotal)}`);
  if (d.fulfillmentType === "delivery") lines.push(`${T.delivery}: ${m(d.deliveryFee)}`);
  lines.push(`${T.total}: ${m(d.grandTotal)}`);

  lines.push("", `${T.payment}: ${paymentMethodLabel(d.paymentMethodCode, locale)}`);
  lines.push(isCod ? `${T.due}: ${m(d.grandTotal)}` : T.paid);

  if (d.fulfillmentType === "delivery" && d.address) {
    lines.push("", T.address, formatAddress(d.address, locale));
  } else if (d.fulfillmentType === "pickup") {
    lines.push("", T.pickup);
  }

  if (d.trackingUrl) lines.push("", `${T.track}: ${d.trackingUrl}`);
  if (d.accountSetupUrl) {
    lines.push("", T.accountSaved, T.accountCta, d.accountSetupUrl);
    if (d.accountLogin) lines.push(`${T.accountLogin}: ${d.accountLogin}`);
    lines.push(T.accountNote);
  }
  lines.push("", T.thanks);
  return lines.join("\n");
}
