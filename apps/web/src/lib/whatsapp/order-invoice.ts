import "server-only";
import { after } from "next/server";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import {
  addresses,
  customers,
  db,
  orderItems,
  orderNotifications,
  orders,
  paymentMethods,
  payments,
  users,
  type NotificationKind,
  type NotificationStatus,
  type OrderStatus,
} from "@verella/db";
import { localizedPath, siteUrl } from "@/lib/seo";
import { getAdminWhatsAppPhone, getSiteName } from "@/lib/settings/queries";
import {
  buildAccountCredentialsMessage,
  buildAdminNewOrderMessage,
  buildOrderInvoiceMessage,
  buildOrderStatusMessage,
  checkInvoiceEligibility,
  isNotifiedStatus,
  type InvoiceIneligibleReason,
} from "./invoice";
import { normalizeEgyptianPhone, toWhatsAppId } from "./phone";
import { sendText } from "./service";

/** A claim still "sending" after this long is treated as crashed and may be retried. */
const STALE_CLAIM_MS = 5 * 60 * 1000;
/** Stop retrying after this many attempts — needs a person to look at it. */
const MAX_ATTEMPTS = 5;

const CHANNEL = "whatsapp" as const;

export type NotificationResult =
  | { status: "sent"; messageId: string | null }
  | {
      status: "skipped";
      reason: InvoiceIneligibleReason | "order_not_found" | "in_progress_or_exhausted" | "invoice_not_sent" | "status_changed" | "not_notified";
    }
  | { status: "failed"; error: string };

const logResult = (orderId: number, what: string, r: NotificationResult) => {
  if (r.status === "failed") console.error(`[whatsapp] ${what} for order ${orderId} failed: ${r.error}`);
  else if (r.status === "sent") console.info(`[whatsapp] ${what} sent for order ${orderId}`);
};

/**
 * Queue the automatic WhatsApp invoice to run after the current response is
 * sent. Eligibility and the once-only guarantee are decided inside, so extra
 * calls are harmless.
 */
export function triggerOrderWhatsAppInvoice(orderId: number): void {
  after(async () => logResult(orderId, "invoice", await sendOrderWhatsAppInvoice(orderId)));
}

/**
 * A new website order: the customer's invoice (if eligible), their new
 * account's login details (when checkout created one), and the store-owner alert.
 */
export function triggerNewOrderWhatsApp(orderId: number, credentials?: { login: string; password: string } | null): void {
  after(async () => {
    logResult(orderId, "invoice", await sendOrderWhatsAppInvoice(orderId));
    if (credentials) logResult(orderId, "account details", await sendAccountCredentialsWhatsApp(orderId, credentials));
    logResult(orderId, "new-order alert", await sendAdminNewOrderAlert(orderId));
  });
}

/**
 * For an admin status change: (re)try the invoice if it hasn't gone out yet,
 * then send this status's update message — once per status, ever.
 */
export function triggerOrderWhatsAppStatusUpdate(orderId: number, status: OrderStatus): void {
  after(async () => {
    logResult(orderId, "invoice", await sendOrderWhatsAppInvoice(orderId));
    if (isNotifiedStatus(status)) logResult(orderId, `"${status}" update`, await sendOrderWhatsAppStatusUpdate(orderId, status));
  });
}

// ── Order context ───────────────────────────────────────────────────────

async function loadOrder(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.deletedAt) return null;

  const [[payment], items, [address], [account], notifications] = await Promise.all([
    db
      .select({ status: payments.status, methodCode: paymentMethods.code })
      .from(payments)
      .innerJoin(paymentMethods, eq(paymentMethods.id, payments.methodId))
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.id))
      .limit(1),
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    order.addressId ? db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1) : Promise.resolve([]),
    order.customerId
      ? db
          .select({ phone: users.phone, fullName: users.fullName })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.userId))
          .where(eq(customers.id, order.customerId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ kind: orderNotifications.kind, status: orderNotifications.status, recipient: orderNotifications.recipient })
      .from(orderNotifications)
      .where(and(eq(orderNotifications.orderId, orderId), eq(orderNotifications.channel, CHANNEL))),
  ]);

  // Who to message: the delivery address phone (what the courier calls), then
  // the checkout contact (pickup / guests), then the account's phone.
  const contact = (order.guestContact ?? {}) as { name?: string; phone?: string };
  const phone =
    [address?.phone, contact.phone, account?.phone].find((p) => normalizeEgyptianPhone(p) !== null) ??
    address?.phone ??
    contact.phone ??
    account?.phone ??
    null;
  const invoice = notifications.find((n) => n.kind === "invoice");

  return {
    order,
    payment,
    items,
    address,
    phone,
    customerName: address?.recipientName ?? contact.name ?? account?.fullName ?? null,
    invoiceStatus: (invoice?.status as NotificationStatus | undefined) ?? null,
    invoiceRecipient: invoice?.recipient ?? null,
    trackingUrl: `${siteUrl()}${localizedPath("ar", `/order/${order.orderNumber}`)}`,
  };
}

const storeNameAr = () =>
  getSiteName()
    .then((n) => n.ar)
    .catch(() => undefined);

// ── Invoice ─────────────────────────────────────────────────────────────

/**
 * Send one order's WhatsApp invoice — at most once, ever.
 *
 * WhatsApp is a secondary notification: this never throws and never touches
 * order or payment state. A failure is recorded and retried on the order's
 * next lifecycle event (payment review, status change).
 */
export async function sendOrderWhatsAppInvoice(orderId: number): Promise<NotificationResult> {
  return guard(orderId, "invoice", async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };

    const eligibility = checkInvoiceEligibility({
      orderStatus: ctx.order.status,
      paymentMethodCode: ctx.payment?.methodCode ?? null,
      paymentStatus: ctx.payment?.status ?? null,
      phone: ctx.phone,
      invoiceStatus: ctx.invoiceStatus,
    });
    if (!eligibility.eligible) return { status: "skipped", reason: eligibility.reason };

    const { order } = ctx;
    return deliverOnce(orderId, "invoice", toWhatsAppId(ctx.phone)!, state, async () =>
      buildOrderInvoiceMessage({
        orderNumber: order.orderNumber,
        customerName: ctx.customerName,
        fulfillmentType: order.fulfillmentType,
        items: ctx.items.map((i) => ({ name: i.nameSnapshot, variant: i.variantLabelSnapshot, quantity: i.quantity, lineTotal: i.lineTotal })),
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        paymentMethodCode: ctx.payment!.methodCode,
        address: ctx.address ?? null,
        trackingUrl: ctx.trackingUrl,
        storeName: await storeNameAr(),
      }),
    );
  });
}

// ── Status updates ──────────────────────────────────────────────────────

/**
 * Tell the customer their order moved to `status` — once per status, ever.
 * Only after their invoice has gone out (so the invoice always comes first),
 * and only if the order is still in that status when we get to it.
 */
export async function sendOrderWhatsAppStatusUpdate(orderId: number, status: OrderStatus): Promise<NotificationResult> {
  if (!isNotifiedStatus(status)) return { status: "skipped", reason: "not_notified" };
  const kind = `status_${status}` as const;

  return guard(orderId, kind, async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };
    // A quick follow-up change (e.g. preparing → out for delivery) wins; don't send a stale update.
    if (ctx.order.status !== status) return { status: "skipped", reason: "status_changed" };
    if (ctx.invoiceStatus !== "sent" || !ctx.invoiceRecipient) return { status: "skipped", reason: "invoice_not_sent" };

    const { order } = ctx;
    // Same recipient the invoice went to — updates always reach the same chat.
    return deliverOnce(orderId, kind, ctx.invoiceRecipient, state, async () =>
      buildOrderStatusMessage({
        orderNumber: order.orderNumber,
        status,
        fulfillmentType: order.fulfillmentType,
        paymentMethodCode: ctx.payment?.methodCode ?? "",
        grandTotal: order.grandTotal,
        customerName: ctx.customerName,
        trackingUrl: ctx.trackingUrl,
        storeName: await storeNameAr(),
      })!,
    );
  });
}

// ── New-account login details ───────────────────────────────────────────

/**
 * Send the login details of the account created with this guest order to the
 * order's phone — once. The password exists only in memory here (the DB holds
 * its hash), so a failed send isn't retried later; the customer can still
 * reset it, or the store can.
 */
export async function sendAccountCredentialsWhatsApp(
  orderId: number,
  credentials: { login: string; password: string },
): Promise<NotificationResult> {
  return guard(orderId, "account_credentials", async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };
    const jid = toWhatsAppId(ctx.phone);
    if (!jid) return { status: "skipped", reason: "invalid_phone" };

    return deliverOnce(orderId, "account_credentials", jid, state, async () =>
      buildAccountCredentialsMessage({
        ...credentials,
        loginUrl: `${siteUrl()}${localizedPath("ar", "/login")}`,
        customerName: ctx.customerName,
        storeName: await storeNameAr(),
      }),
    );
  });
}

// ── Store-owner alert ───────────────────────────────────────────────────

/**
 * Message the number set in Admin → Settings that a new order came in — every
 * payment method, immediately, once per order. Off when no number is set.
 */
export async function sendAdminNewOrderAlert(orderId: number): Promise<NotificationResult> {
  return guard(orderId, "admin_new_order", async (state) => {
    const adminJid = toWhatsAppId(await getAdminWhatsAppPhone());
    if (!adminJid) return { status: "skipped", reason: "not_notified" };

    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };

    const { order } = ctx;
    return deliverOnce(orderId, "admin_new_order", adminJid, state, async () =>
      buildAdminNewOrderMessage({
        orderNumber: order.orderNumber,
        customerName: ctx.customerName,
        customerPhone: ctx.phone,
        fulfillmentType: order.fulfillmentType,
        items: ctx.items.map((i) => ({ name: i.nameSnapshot, variant: i.variantLabelSnapshot, quantity: i.quantity, lineTotal: i.lineTotal })),
        grandTotal: order.grandTotal,
        paymentMethodCode: ctx.payment?.methodCode ?? "",
        governorate: ctx.address?.governorate ?? null,
        area: ctx.address?.area ?? null,
        adminUrl: `${siteUrl()}/admin/orders/${order.id}`,
      }),
    );
  });
}

// ── Once-only delivery ──────────────────────────────────────────────────

type ClaimState = { claimed: boolean };

/** Never throws. Only the caller holding the claim may mark it failed. */
async function guard(
  orderId: number,
  kind: NotificationKind,
  fn: (state: ClaimState) => Promise<NotificationResult>,
): Promise<NotificationResult> {
  const state: ClaimState = { claimed: false };
  try {
    return await fn(state);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (state.claimed) await markFailed(orderId, kind, error).catch(() => {});
    return { status: "failed", error };
  }
}

async function deliverOnce(
  orderId: number,
  kind: NotificationKind,
  jid: string,
  state: ClaimState,
  buildMessage: () => Promise<string>,
): Promise<NotificationResult> {
  if (!(await claim(orderId, kind, jid))) return { status: "skipped", reason: "in_progress_or_exhausted" };
  state.claimed = true;

  const result = await sendText(jid, await buildMessage());
  if (!result.ok) {
    await markFailed(orderId, kind, result.error);
    state.claimed = false;
    return { status: "failed", error: result.error };
  }

  // The customer already has the message. Recording that must not be lost to a
  // DB blip — a "failed"/stale row would be retried and they'd get it twice.
  state.claimed = false;
  for (let attempt = 1; ; attempt++) {
    try {
      await db
        .update(orderNotifications)
        .set({ status: "sent", sentAt: new Date(), providerMessageId: result.messageId, lastError: null })
        .where(rowFor(orderId, kind));
      break;
    } catch (err) {
      if (attempt >= 5) {
        console.error(`[whatsapp] ${kind} for order ${orderId} WAS DELIVERED but could not be recorded as sent`, err);
        break;
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return { status: "sent", messageId: result.messageId };
}

const rowFor = (orderId: number, kind: NotificationKind) =>
  and(eq(orderNotifications.orderId, orderId), eq(orderNotifications.channel, CHANNEL), eq(orderNotifications.kind, kind));

/**
 * Atomically take the right to send. Exactly one concurrent caller wins:
 *  - first ever attempt: INSERT IGNORE on the (order, channel, kind) unique key;
 *  - later: flip a "failed" (or crashed, stale "sending") row back to "sending".
 * A "sent" row can never be claimed again.
 */
async function claim(orderId: number, kind: NotificationKind, jid: string): Promise<boolean> {
  const [inserted] = await db
    .insert(orderNotifications)
    .ignore()
    .values({ orderId, channel: CHANNEL, kind, status: "sending", recipient: jid, attempts: 1, attemptedAt: new Date() });
  if (inserted.affectedRows === 1) return true;

  const [updated] = await db
    .update(orderNotifications)
    .set({ status: "sending", recipient: jid, attempts: sql`${orderNotifications.attempts} + 1`, attemptedAt: new Date(), lastError: null })
    .where(
      and(
        rowFor(orderId, kind),
        lt(orderNotifications.attempts, MAX_ATTEMPTS),
        or(
          eq(orderNotifications.status, "failed"),
          and(eq(orderNotifications.status, "sending"), lt(orderNotifications.attemptedAt, new Date(Date.now() - STALE_CLAIM_MS))),
        ),
      ),
    );
  return updated.affectedRows === 1;
}

async function markFailed(orderId: number, kind: NotificationKind, error: string): Promise<void> {
  await db
    .update(orderNotifications)
    .set({ status: "failed", lastError: error.slice(0, 255) })
    .where(and(rowFor(orderId, kind), eq(orderNotifications.status, "sending")));
}
