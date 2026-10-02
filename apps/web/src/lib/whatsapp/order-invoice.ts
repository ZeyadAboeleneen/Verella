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
  type NotificationChannel,
  type NotificationKind,
  type NotificationStatus,
  type OrderStatus,
} from "@verella/db";
import { localizedPath, siteUrl } from "@/lib/seo";
import { getAdminWhatsAppPhone, getSiteName } from "@/lib/settings/queries";
import { isEmailConfigured, sendEmail } from "@/lib/email/mailer";
import {
  buildAdminNewOrderMessage,
  buildOrderInvoiceMessage,
  buildOrderStatusMessage,
  checkInvoiceEligibility,
  isNotifiedStatus,
  type InvoiceData,
  type InvoiceIneligibleReason,
  type MessageLocale,
  type StatusMessageData,
} from "./invoice";
import { renderOrderConfirmationEmail, renderOrderStatusEmail } from "@/lib/email/order-templates";
import { jidToLocalPhone, normalizeEgyptianPhone, toWhatsAppId } from "./phone";
import { createAccountSetupUrl } from "@/lib/auth/account-setup";
import { sendText } from "./service";

/** A claim still "sending" after this long is treated as crashed and may be retried. */
const STALE_CLAIM_MS = 5 * 60 * 1000;
/** Stop retrying after this many attempts — needs a person to look at it. */
const MAX_ATTEMPTS = 5;

export type NotificationResult =
  | { status: "sent"; messageId: string | null }
  | {
      status: "skipped";
      reason:
        | InvoiceIneligibleReason
        | "order_not_found"
        | "in_progress_or_exhausted"
        | "invoice_not_sent"
        | "status_changed"
        | "not_notified"
        | "no_email"
        | "email_not_configured";
    }
  | { status: "failed"; error: string };

type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

const logResult = (orderId: number, what: string, r: NotificationResult) => {
  if (r.status === "failed") console.error(`[notify] ${what} for order ${orderId} failed: ${r.error}`);
  else if (r.status === "sent") console.info(`[notify] ${what} sent for order ${orderId}`);
};

/**
 * Queue the customer's order confirmation (WhatsApp + email) to run after the
 * current response is sent. Eligibility and the once-only guarantee are
 * decided inside, so extra calls are harmless.
 */
export function triggerOrderWhatsAppInvoice(orderId: number): void {
  after(async () => {
    logResult(orderId, "whatsapp invoice", await sendOrderWhatsAppInvoice(orderId));
    logResult(orderId, "email invoice", await sendOrderEmailInvoice(orderId));
  });
}

/**
 * A new website order: the customer's confirmation on WhatsApp and email (if
 * eligible — it carries the "create your password" invite when their account
 * has none yet) and the store-owner alert.
 */
export function triggerNewOrderWhatsApp(orderId: number): void {
  after(async () => {
    logResult(orderId, "whatsapp invoice", await sendOrderWhatsAppInvoice(orderId));
    logResult(orderId, "email invoice", await sendOrderEmailInvoice(orderId));
    logResult(orderId, "new-order alert", await sendAdminNewOrderAlert(orderId));
  });
}

/**
 * For an admin status change: (re)try the confirmation if it hasn't gone out
 * yet, then send this status's update — once per status and channel, ever.
 */
export function triggerOrderWhatsAppStatusUpdate(orderId: number, status: OrderStatus): void {
  after(async () => {
    logResult(orderId, "whatsapp invoice", await sendOrderWhatsAppInvoice(orderId));
    logResult(orderId, "email invoice", await sendOrderEmailInvoice(orderId));
    if (!isNotifiedStatus(status)) return;
    logResult(orderId, `whatsapp "${status}" update`, await sendOrderWhatsAppStatusUpdate(orderId, status));
    logResult(orderId, `email "${status}" update`, await sendOrderEmailStatusUpdate(orderId, status));
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
          .select({ userId: users.id, email: users.email, phone: users.phone, fullName: users.fullName, passwordHash: users.passwordHash })
          .from(customers)
          .innerJoin(users, eq(users.id, customers.userId))
          .where(eq(customers.id, order.customerId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ channel: orderNotifications.channel, kind: orderNotifications.kind, status: orderNotifications.status, recipient: orderNotifications.recipient })
      .from(orderNotifications)
      .where(eq(orderNotifications.orderId, orderId)),
  ]);

  // Who to message: the delivery address phone (what the courier calls), then
  // the checkout contact (pickup / guests), then the account's phone.
  const contact = (order.guestContact ?? {}) as { name?: string; phone?: string; email?: string };
  const phone =
    [address?.phone, contact.phone, account?.phone].find((p) => normalizeEgyptianPhone(p) !== null) ??
    address?.phone ??
    contact.phone ??
    account?.phone ??
    null;
  // Email: the account's, else the one typed at checkout.
  const email = [account?.email, contact.email].map((e) => e?.trim()).find((e) => e && e.includes("@")) ?? null;
  const invoiceOn = (channel: NotificationChannel) => notifications.find((n) => n.channel === channel && n.kind === "invoice");

  return {
    order,
    payment,
    items,
    address,
    account,
    phone,
    email,
    customerName: address?.recipientName ?? contact.name ?? account?.fullName ?? null,
    invoice: {
      whatsapp: invoiceOn("whatsapp"),
      email: invoiceOn("email"),
    },
    locale: order.locale,
    trackingUrl: `${siteUrl()}${localizedPath(order.locale, `/order/${order.orderNumber}`)}`,
  };
}
type OrderContext = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

/** The store name in the order language (customer messages). */
const storeName = (locale: MessageLocale = "ar") =>
  getSiteName()
    .then((n) => n[locale])
    .catch(() => undefined);

/** The confirmation content, optionally with the "create your password" invite. */
async function invoiceData(ctx: OrderContext, invite: { userId: number; login: string } | null): Promise<InvoiceData> {
  const { order } = ctx;
  return {
    ...(invite && {
      accountSetupUrl: await createAccountSetupUrl(invite.userId, siteUrl(), ctx.locale),
      accountLogin: invite.login,
    }),
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
    storeName: await storeName(ctx.locale),
    locale: ctx.locale,
  };
}

async function statusData(ctx: OrderContext, status: OrderStatus): Promise<StatusMessageData> {
  const { order } = ctx;
  return {
    orderNumber: order.orderNumber,
    status,
    fulfillmentType: order.fulfillmentType,
    paymentMethodCode: ctx.payment?.methodCode ?? "",
    grandTotal: order.grandTotal,
    customerName: ctx.customerName,
    trackingUrl: ctx.trackingUrl,
    storeName: await storeName(ctx.locale),
    locale: ctx.locale,
  };
}

// ── WhatsApp ────────────────────────────────────────────────────────────

/**
 * Send one order's WhatsApp invoice — at most once, ever.
 *
 * Notifications are secondary: these never throw and never touch order or
 * payment state. A failure is recorded and retried on the order's next
 * lifecycle event (payment review, status change).
 */
export async function sendOrderWhatsAppInvoice(orderId: number): Promise<NotificationResult> {
  return guard(orderId, "whatsapp", "invoice", async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };

    const eligibility = checkInvoiceEligibility({
      orderStatus: ctx.order.status,
      paymentMethodCode: ctx.payment?.methodCode ?? null,
      paymentStatus: ctx.payment?.status ?? null,
      phone: ctx.phone,
      invoiceStatus: (ctx.invoice.whatsapp?.status as NotificationStatus | undefined) ?? null,
    });
    if (!eligibility.eligible) return { status: "skipped", reason: eligibility.reason };

    const { account } = ctx;
    const jid = toWhatsAppId(ctx.phone)!;
    // The account holding this order has no password yet: invite them to create
    // one, right in the confirmation. Only when this WhatsApp number is the
    // account's own, so the link reaches no one else. Created only once the
    // send is claimed, so a skipped send never mints a link.
    const invite =
      account && !account.passwordHash && normalizeEgyptianPhone(account.phone) === normalizeEgyptianPhone(ctx.phone)
        ? { userId: account.userId, login: account.email ?? jidToLocalPhone(jid) ?? ctx.phone! }
        : null;
    return deliverOnce(orderId, "whatsapp", "invoice", jid, state, async () => sendText(jid, buildOrderInvoiceMessage(await invoiceData(ctx, invite))));
  });
}

/**
 * Tell the customer their order moved to `status` — once per status, ever.
 * Only after their invoice has gone out (so the invoice always comes first),
 * and only if the order is still in that status when we get to it.
 */
export async function sendOrderWhatsAppStatusUpdate(orderId: number, status: OrderStatus): Promise<NotificationResult> {
  if (!isNotifiedStatus(status)) return { status: "skipped", reason: "not_notified" };
  const kind = `status_${status}` as const;

  return guard(orderId, "whatsapp", kind, async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };
    // A quick follow-up change (e.g. preparing → out for delivery) wins; don't send a stale update.
    if (ctx.order.status !== status) return { status: "skipped", reason: "status_changed" };
    const invoice = ctx.invoice.whatsapp;
    // Updates go to the same chat as the invoice. A cancellation is the one
    // update that also goes out when there never was an invoice (e.g. a rejected
    // InstaPay / Vodafone Cash transfer) — straight to the order's number.
    const sentTo = invoice?.status === "sent" ? invoice.recipient : null;
    const to = sentTo ?? (status === "cancelled" ? toWhatsAppId(ctx.phone) : null);
    if (!to) return { status: "skipped", reason: status === "cancelled" ? "invalid_phone" : "invoice_not_sent" };
    return deliverOnce(orderId, "whatsapp", kind, to, state, async () => sendText(to, buildOrderStatusMessage(await statusData(ctx, status))!));
  });
}

// ── Email ───────────────────────────────────────────────────────────────

/** A branded HTML email, with the WhatsApp text as the plain-text part. */
async function emailMessage(to: string, email: { subject: string; html: string }, text: string): Promise<SendResult> {
  await sendEmail({ to, subject: email.subject, html: email.html, text });
  return { ok: true, messageId: null };
}

/**
 * The order confirmation by email — same rules and timing as WhatsApp (cash
 * on delivery right away, wallet transfers after approval), once per order.
 * Only when the customer gave an email and SMTP is configured; until then it
 * isn't recorded, so nothing is lost once email is set up.
 */
export async function sendOrderEmailInvoice(orderId: number): Promise<NotificationResult> {
  if (!isEmailConfigured()) return { status: "skipped", reason: "email_not_configured" };
  return guard(orderId, "email", "invoice", async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };
    const to = ctx.email;
    if (!to) return { status: "skipped", reason: "no_email" };

    const eligibility = checkInvoiceEligibility({
      orderStatus: ctx.order.status,
      paymentMethodCode: ctx.payment?.methodCode ?? null,
      paymentStatus: ctx.payment?.status ?? null,
      phone: ctx.phone,
      invoiceStatus: (ctx.invoice.email?.status as NotificationStatus | undefined) ?? null,
    });
    // The phone only matters for WhatsApp.
    if (!eligibility.eligible && eligibility.reason !== "invalid_phone") return { status: "skipped", reason: eligibility.reason };

    const { account } = ctx;
    // Invite only to the account's own email address.
    const invite =
      account && !account.passwordHash && account.email && account.email.toLowerCase() === to.toLowerCase()
        ? { userId: account.userId, login: account.email }
        : null;
    return deliverOnce(orderId, "email", "invoice", to, state, async () => {
      const data = await invoiceData(ctx, invite);
      return emailMessage(to, renderOrderConfirmationEmail(data), buildOrderInvoiceMessage(data));
    });
  });
}

/** A status update by email — once per status, after the email confirmation went out. */
export async function sendOrderEmailStatusUpdate(orderId: number, status: OrderStatus): Promise<NotificationResult> {
  if (!isNotifiedStatus(status)) return { status: "skipped", reason: "not_notified" };
  if (!isEmailConfigured()) return { status: "skipped", reason: "email_not_configured" };
  const kind = `status_${status}` as const;

  return guard(orderId, "email", kind, async (state) => {
    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };
    if (ctx.order.status !== status) return { status: "skipped", reason: "status_changed" };
    const invoice = ctx.invoice.email;
    // Same exception as WhatsApp: a cancellation goes out even without a confirmation email.
    const sentTo = invoice?.status === "sent" ? invoice.recipient : null;
    const to = sentTo ?? (status === "cancelled" ? ctx.email : null);
    if (!to) return { status: "skipped", reason: status === "cancelled" ? "no_email" : "invoice_not_sent" };
    return deliverOnce(orderId, "email", kind, to, state, async () => {
      const data = await statusData(ctx, status);
      return emailMessage(to, renderOrderStatusEmail(data)!, buildOrderStatusMessage(data)!);
    });
  });
}

// ── Store-owner alert ───────────────────────────────────────────────────

/**
 * Message the number set in Admin → Settings that a new order came in — every
 * payment method, immediately, once per order. Off when no number is set.
 */
export async function sendAdminNewOrderAlert(orderId: number): Promise<NotificationResult> {
  return guard(orderId, "whatsapp", "admin_new_order", async (state) => {
    const adminJid = toWhatsAppId(await getAdminWhatsAppPhone());
    if (!adminJid) return { status: "skipped", reason: "not_notified" };

    const ctx = await loadOrder(orderId);
    if (!ctx) return { status: "skipped", reason: "order_not_found" };

    const { order } = ctx;
    const text = () =>
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
      });
    return deliverOnce(orderId, "whatsapp", "admin_new_order", adminJid, state, async () => sendText(adminJid, text()));
  });
}

// ── Once-only delivery ──────────────────────────────────────────────────

type ClaimState = { claimed: boolean };

/** Never throws. Only the caller holding the claim may mark it failed. */
async function guard(
  orderId: number,
  channel: NotificationChannel,
  kind: NotificationKind,
  fn: (state: ClaimState) => Promise<NotificationResult>,
): Promise<NotificationResult> {
  const state: ClaimState = { claimed: false };
  try {
    return await fn(state);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (state.claimed) await markFailed(orderId, channel, kind, error).catch(() => {});
    return { status: "failed", error };
  }
}

async function deliverOnce(
  orderId: number,
  channel: NotificationChannel,
  kind: NotificationKind,
  recipient: string,
  state: ClaimState,
  send: () => Promise<SendResult>,
): Promise<NotificationResult> {
  if (!(await claim(orderId, channel, kind, recipient))) return { status: "skipped", reason: "in_progress_or_exhausted" };
  state.claimed = true;

  const result = await send();
  if (!result.ok) {
    await markFailed(orderId, channel, kind, result.error);
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
        .where(rowFor(orderId, channel, kind));
      break;
    } catch (err) {
      if (attempt >= 5) {
        console.error(`[notify] ${channel} ${kind} for order ${orderId} WAS DELIVERED but could not be recorded as sent`, err);
        break;
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return { status: "sent", messageId: result.messageId };
}

const rowFor = (orderId: number, channel: NotificationChannel, kind: NotificationKind) =>
  and(eq(orderNotifications.orderId, orderId), eq(orderNotifications.channel, channel), eq(orderNotifications.kind, kind));

/**
 * Atomically take the right to send. Exactly one concurrent caller wins:
 *  - first ever attempt: INSERT IGNORE on the (order, channel, kind) unique key;
 *  - later: flip a "failed" (or crashed, stale "sending") row back to "sending".
 * A "sent" row can never be claimed again.
 */
async function claim(orderId: number, channel: NotificationChannel, kind: NotificationKind, recipient: string): Promise<boolean> {
  const [inserted] = await db
    .insert(orderNotifications)
    .ignore()
    .values({ orderId, channel, kind, status: "sending", recipient, attempts: 1, attemptedAt: new Date() });
  if (inserted.affectedRows === 1) return true;

  const [updated] = await db
    .update(orderNotifications)
    .set({ status: "sending", recipient, attempts: sql`${orderNotifications.attempts} + 1`, attemptedAt: new Date(), lastError: null })
    .where(
      and(
        rowFor(orderId, channel, kind),
        lt(orderNotifications.attempts, MAX_ATTEMPTS),
        or(
          eq(orderNotifications.status, "failed"),
          and(eq(orderNotifications.status, "sending"), lt(orderNotifications.attemptedAt, new Date(Date.now() - STALE_CLAIM_MS))),
        ),
      ),
    );
  return updated.affectedRows === 1;
}

async function markFailed(orderId: number, channel: NotificationChannel, kind: NotificationKind, error: string): Promise<void> {
  await db
    .update(orderNotifications)
    .set({ status: "failed", lastError: error.slice(0, 255) })
    .where(and(rowFor(orderId, channel, kind), eq(orderNotifications.status, "sending")));
}
