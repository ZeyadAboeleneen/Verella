/**
 * WhatsApp order invoice — eligibility rules and message text.
 *
 * Pure functions only (no database, no network) so the offline test script
 * can exercise exactly the logic production uses.
 */
import { formatMoney, governorateLabel, toCents, WALLET_PAYMENT_METHODS, type PaymentMethodCode } from "@verella/core";
import type { NotificationStatus, OrderStatus, PaymentStatus } from "@verella/db";
import ar from "@/lib/i18n/dictionaries/ar.json";
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
  storeName?: string;
}

const money = (value: string) => formatMoney(toCents(value), "EGP", "ar");

/** Same Arabic labels the checkout page shows ("الدفع عند الاستلام", "فودافون كاش", …). */
export function paymentMethodLabel(code: string): string {
  const methods = ar.checkout.methods as Record<string, { label: string } | undefined>;
  return methods[code]?.label ?? code;
}

function formatAddress(a: NonNullable<InvoiceData["address"]>): string {
  const line1 = [
    a.street,
    a.building && `عمارة ${a.building}`,
    a.floor && `الدور ${a.floor}`,
    a.apartment && `شقة ${a.apartment}`,
  ].filter(Boolean);
  const line2 = [a.area, a.city, governorateLabel(a.governorate, "ar")].filter(Boolean);
  return [line1.join("، "), line2.join("، "), a.landmark && `علامة مميزة: ${a.landmark}`].filter(Boolean).join("\n");
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

export interface AccountCredentialsData {
  login: string;
  password: string;
  loginUrl: string;
  customerName?: string | null;
  storeName?: string;
}

/** Login details for the account created with a guest's first order. */
export function buildAccountCredentialsMessage(d: AccountCredentialsData): string {
  const store = d.storeName ?? "ڤيريلا";
  const lines: string[] = [];
  lines.push(d.customerName?.trim() ? `أهلاً ${d.customerName.trim()} 👋` : "أهلاً 👋");
  lines.push("", `عملنالك حساب على ${store} عشان تتابع طلباتك بسهولة.`);
  lines.push("", `تسجيل الدخول: ${d.loginUrl}`);
  lines.push(`الإيميل أو الموبايل: ${d.login}`);
  lines.push(`كلمة المرور: ${d.password}`);
  lines.push("", "تقدر تغيّر كلمة المرور من حسابك في أي وقت.");
  lines.push("", `${store} ❤️`);
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
}

/** Arabic status-update message, or null for statuses that don't notify the customer. */
export function buildOrderStatusMessage(d: StatusMessageData): string | null {
  if (!isNotifiedStatus(d.status)) return null;
  const store = d.storeName ?? "ڤيريلا";
  const n = `#${d.orderNumber}`;
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const greeting = d.customerName?.trim() ? `أهلاً ${d.customerName.trim()}،\n` : "";

  const body: Record<NotifiedStatus, string> = {
    preparing: `طلبك ${n} بيتجهز دلوقتي 📦`,
    out_for_delivery:
      `طلبك ${n} خرج للتوصيل 🚚\nالمندوب هيتواصل معاك قريب.` +
      (isCod ? `\nالمطلوب عند الاستلام: ${money(d.grandTotal)}` : ""),
    ready_for_pickup: `طلبك ${n} جاهز للاستلام من الفرع ✅`,
    completed:
      d.fulfillmentType === "pickup"
        ? `تم استلام طلبك ${n} بنجاح ✅`
        : `تم توصيل طلبك ${n} بنجاح ✅\nنتمنى المنتجات تعجبك ❤️`,
    cancelled: `تم إلغاء طلبك ${n}.\nلو عندك أي استفسار، كلّمنا على الرقم ده.`,
  };

  const lines = [greeting + body[d.status]];
  if (d.trackingUrl && d.status !== "cancelled") lines.push("", `تابع طلبك: ${d.trackingUrl}`);
  lines.push("", `${store} ❤️`);
  return lines.join("\n");
}

/** The Arabic WhatsApp invoice. Built only from the order's own snapshot data. */
export function buildOrderInvoiceMessage(d: InvoiceData): string {
  const store = d.storeName ?? "ڤيريلا";
  const isCod = d.paymentMethodCode === "cash_on_delivery";
  const lines: string[] = [];

  lines.push("تم تأكيد طلبك بنجاح ❤️");
  if (d.customerName?.trim()) lines.push(`أهلاً ${d.customerName.trim()}،`);
  lines.push("", `رقم الطلب: #${d.orderNumber}`, "", "المنتجات:");
  for (const item of d.items) {
    const variant = item.variant ? ` (${item.variant})` : "";
    lines.push(`- ${item.name}${variant} × ${item.quantity} — ${money(item.lineTotal)}`);
  }

  lines.push("", `المجموع الفرعي: ${money(d.subtotal)}`);
  if (Number(d.discountTotal) > 0) lines.push(`الخصم: −${money(d.discountTotal)}`);
  if (d.fulfillmentType === "delivery") lines.push(`التوصيل: ${money(d.deliveryFee)}`);
  lines.push(`الإجمالي: ${money(d.grandTotal)}`);

  lines.push("", `طريقة الدفع: ${paymentMethodLabel(d.paymentMethodCode)}`);
  lines.push(isCod ? `المطلوب عند الاستلام: ${money(d.grandTotal)}` : "تم استلام الدفع ✅");

  if (d.fulfillmentType === "delivery" && d.address) {
    lines.push("", "العنوان:", formatAddress(d.address));
  } else if (d.fulfillmentType === "pickup") {
    lines.push("", "الاستلام: من الفرع");
  }

  if (d.trackingUrl) lines.push("", `تابع طلبك: ${d.trackingUrl}`);
  lines.push("", `شكراً لطلبك من ${store} ❤️`);
  return lines.join("\n");
}
