"use server";

import { getFreeShippingThresholdCents } from "@/lib/checkout/free-shipping";
import { codDepositCents, getCodDepositSetting } from "@/lib/checkout/cod-deposit";

import { eq, and, gte, count, inArray, isNull, sql } from "drizzle-orm";
import {
  db,
  users,
  customers,
  roles,
  userRoles,
  addresses,
  orders,
  orderItems,
  orderStatusHistory,
  orderDiscounts,
  discountRedemptions,
  discounts,
  payments,
  paymentMethods,
  storeProducts,
  storeProductVariants,
  carts,
  cartItems,
  settings,
} from "@verella/db";
import {
  checkoutSchema,
  type CheckoutInput,
  applyDiscountsToCart,
  computeOrderTotals,
  generateOrderNumber,
  toCents,
  fromCents,
  WALLET_PAYMENT_METHODS,
  GATEWAY_PAYMENT_METHODS,
  type CartLineLike,
} from "@verella/core";
import { auth } from "@/auth";
import { getCart } from "@/lib/cart/queries";
import { getAutoDiscounts, getDiscountByCode } from "@/lib/discounts/resolve";
import { getGuestCartToken, clearGuestCartCookie } from "@/lib/cart/guest-token";
import type { ActionResult } from "@/lib/auth/rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/mailer";
import { triggerNewOrderWhatsApp } from "@/lib/whatsapp/order-invoice";
import { normalizeEgyptianPhone } from "@/lib/whatsapp/phone";
import { getFulfillmentTypes, getGovernorateFees, getNotificationEmail, isGuestCheckoutEnabled } from "@/lib/settings/queries";
import { governorateLabel } from "@verella/core";
import { siteUrl } from "@/lib/seo";
import { renderAdminNewOrderEmail } from "@/lib/email/order-templates";
import { getLocale } from "@/lib/i18n";
import { cookies } from "next/headers";
import { CART_CODE_COOKIE } from "@/lib/cart/discount-code-cookie";

/** "Amber Oud — 100ml" when the line is a variant, otherwise just the product name. */
const lineTitle = (l: { name: string; variantLabel: string | null }) => (l.variantLabel ? `${l.name} — ${l.variantLabel}` : l.name);

/**
 * Delivery fee for a governorate: the per-governorate table from Admin →
 * Settings wins; the flat delivery_fee setting is the fallback for
 * unconfigured governorates (and when no table exists at all).
 */
async function getDeliveryFeeCents(governorate?: string | null): Promise<number> {
  if (governorate?.trim()) {
    const fees = await getGovernorateFees();
    const match = fees.find((g) => g.name.trim().toLowerCase() === governorate.trim().toLowerCase());
    if (match) return toCents(match.fee);
  }
  const [row] = await db.select().from(settings).where(and(eq(settings.group, "checkout"), eq(settings.key, "delivery_fee"))).limit(1);
  return toCents((row?.value as string) ?? "30.00");
}

/**
 * Shared by placeOrderAction (commits) and previewOrderTotalsAction (read-only,
 * powers the checkout page's live totals) so pricing logic can't drift between
 * what the customer sees and what they're actually charged.
 */
async function computeCheckoutPricing(
  fulfillmentType: "delivery" | "pickup",
  discountCode: string | undefined,
  governorate?: string | null,
) {
  const session = await auth();
  const userId = session?.user ? Number(session.user.id) : null;

  const cart = await getCart();

  const lines: CartLineLike[] = cart.lines.map((l) => ({
    productId: l.productId,
    categoryId: l.categoryId,
    categoryIds: l.categoryIds,
    unitPriceCents: l.unitPriceCents,
    quantity: l.quantity,
  }));

  const autoDiscounts = await getAutoDiscounts();
  let codeDiscount: Awaited<ReturnType<typeof getDiscountByCode>> = null;
  if (discountCode) {
    codeDiscount = await getDiscountByCode(discountCode);
  }

  let userRedemptionCount = 0;
  if (codeDiscount && userId) {
    const [row] = await db
      .select({ value: count() })
      .from(discountRedemptions)
      .where(and(eq(discountRedemptions.discountId, codeDiscount.id), eq(discountRedemptions.userId, userId)));
    userRedemptionCount = row?.value ?? 0;
  }

  const discountResult = applyDiscountsToCart(
    lines,
    autoDiscounts,
    codeDiscount ? { discount: codeDiscount, userRedemptionCount } : null,
  );

  let deliveryFeeCents = fulfillmentType === "delivery" ? await getDeliveryFeeCents(governorate) : 0;
  // Free delivery once the order (after discounts) reaches the admin's threshold.
  const freeFromCents = await getFreeShippingThresholdCents();
  if (deliveryFeeCents > 0 && freeFromCents > 0 && discountResult.subtotalCents - discountResult.discountTotalCents >= freeFromCents) {
    deliveryFeeCents = 0;
  }
  const totals = computeOrderTotals({
    subtotalCents: discountResult.subtotalCents,
    discountTotalCents: discountResult.discountTotalCents,
    deliveryFeeCents,
  });

  return { cart, userId, codeDiscount, discountResult, totals };
}

export interface CheckoutTotalsPreview {
  subtotalCents: number;
  discountTotalCents: number;
  deliveryFeeCents: number;
  taxTotalCents: number;
  grandTotalCents: number;
  discountError?: string;
}

/** Read-only — recomputes totals as fulfillment type / discount code change, before the order is placed. */
export async function previewOrderTotalsAction(
  fulfillmentType: "delivery" | "pickup",
  discountCode: string | undefined,
  governorate?: string | null,
): Promise<ActionResult<CheckoutTotalsPreview>> {
  const cart = await getCart();
  if (cart.lines.length === 0) {
    return { success: true, data: { subtotalCents: 0, discountTotalCents: 0, deliveryFeeCents: 0, taxTotalCents: 0, grandTotalCents: 0 } };
  }

  const code = discountCode?.trim() || undefined;
  const { codeDiscount, discountResult, totals } = await computeCheckoutPricing(fulfillmentType, code, governorate);
  const discountError = code ? (codeDiscount ? discountResult.codeError : "This discount code doesn't exist.") : undefined;

  return {
    success: true,
    data: {
      subtotalCents: toCents(totals.subtotal),
      discountTotalCents: toCents(totals.discountTotal),
      deliveryFeeCents: toCents(totals.deliveryFee),
      taxTotalCents: toCents(totals.taxTotal),
      grandTotalCents: toCents(totals.grandTotal),
      discountError,
    },
  };
}

async function customerIdFor(userId: number): Promise<number> {
  const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(customers).values({ userId }).$returningId();
  return row.id;
}

/** A passwordless customer account; returns the new user's id. */
async function createCustomerAccount(values: { email: string | null; phone: string; fullName: string }): Promise<number> {
  const [userRow] = await db.insert(users).values({ ...values, passwordHash: null, status: "active" }).$returningId();
  const [customerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.slug, "customer")).limit(1);
  if (customerRole) await db.insert(userRoles).values({ userId: userRow.id, roleId: customerRole.id });
  return userRow.id;
}

/**
 * Every guest order is kept on a customer account (keyed by the email they
 * gave, or their mobile number when they gave none), created without a
 * password. Their order confirmation (WhatsApp / email, see order-invoice.ts)
 * carries a one-time "create your password" link; once they set one, they
 * sign in and all their orders — older ones included — are there.
 *
 * That link only goes to the account's own channels: its email, and the
 * order's WhatsApp when that number is the account's. So typing someone else's
 * email or phone at checkout never hands you their account. Orders are never
 * attached to an account that already has a password (that would leak a
 * stranger's order into it) — that owner simply signs in as usual.
 */
async function resolveOrCreateGuestCustomer(contact: {
  name: string;
  phone: string;
  email?: string;
}): Promise<number | null> {
  const email = contact.email?.trim().toLowerCase() || null;
  const intl = normalizeEgyptianPhone(contact.phone);
  const localPhone = intl ? `0${intl.slice(2)}` : null;

  /** Keep the order on this account; `samePhone`: the order's number is the account's own. */
  const attach = async (userId: number, samePhone: boolean) => {
    const customerId = await customerIdFor(userId);
    if (samePhone && intl && localPhone) {
      // Earlier guest orders on this same number, never linked to an account,
      // join it too — the invite goes to this number's WhatsApp, so only its
      // owner can claim them.
      await db
        .update(orders)
        .set({ customerId })
        .where(
          and(
            isNull(orders.customerId),
            inArray(sql`JSON_UNQUOTE(JSON_EXTRACT(${orders.guestContact}, '$.phone'))`, [localPhone, intl, `+${intl}`]),
          ),
        );
    }
    return customerId;
  };

  if (email) {
    const [existing] = await db
      .select({ id: users.id, passwordHash: users.passwordHash, phone: users.phone })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      if (existing.passwordHash) return null;
      const samePhone = !!intl && normalizeEgyptianPhone(existing.phone ?? "") === intl;
      return attach(existing.id, samePhone);
    }
    const userId = await createCustomerAccount({ email, phone: localPhone ?? contact.phone, fullName: contact.name });
    return attach(userId, true);
  }

  // No email: the mobile number is the login, so it must be a real one.
  if (!intl || !localPhone) return null;
  const onPhone = await db
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(inArray(users.phone, [localPhone, intl, `+${intl}`]))
    .limit(10);
  // Someone already signs in with this number — leave their account alone.
  if (onPhone.some((u) => u.passwordHash)) return null;
  if (onPhone.length > 0) {
    // An older passwordless account on this number. The link only goes to this
    // number's WhatsApp, so only the phone's owner can claim it.
    const [existing] = onPhone;
    await db.update(users).set({ phone: localPhone }).where(eq(users.id, existing.id));
    return attach(existing.id, true);
  }

  const userId = await createCustomerAccount({ email: null, phone: localPhone, fullName: contact.name });
  return attach(userId, true);
}

export async function placeOrderAction(input: CheckoutInput): Promise<ActionResult<{ orderNumber: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid checkout details." };
  const data = parsed.data;

  // Cash-on-delivery orders reserve stock without payment, so a script
  // hammering this action could empty the shelves. 8 orders / hour per IP is
  // far above what a real shopper places.
  const limited = await enforceRateLimit("place-order", 8, 60 * 60 * 1000);
  if (!limited.ok) return { error: limited.error };

  // Defense in depth — the checkout page already redirects guests to /login
  // when this setting is off, but a direct call to this action shouldn't be
  // able to bypass it.
  const session = await auth();
  if (!session?.user && !(await isGuestCheckoutEnabled())) {
    return { error: "Guest checkout is currently disabled. Please sign in to place an order." };
  }

  if (!(await getFulfillmentTypes()).includes(data.fulfillmentType)) {
    return { error: "That delivery option isn't available." };
  }

  // Resolve the delivery governorate first — it determines the delivery fee.
  let governorate: string | null = data.newAddress?.governorate ?? null;
  if (data.fulfillmentType === "delivery" && !governorate && data.addressId) {
    const [saved] = await db.select({ governorate: addresses.governorate }).from(addresses).where(eq(addresses.id, data.addressId)).limit(1);
    governorate = saved?.governorate ?? null;
  }

  const { cart, userId, codeDiscount, discountResult, totals } = await computeCheckoutPricing(
    data.fulfillmentType,
    data.discountCode,
    governorate,
  );
  if (cart.lines.length === 0) return { error: "Your cart is empty." };

  for (const line of cart.lines) {
    if (line.quantity > line.stockQty) return { error: `${lineTitle(line)} no longer has enough stock.` };
  }

  // An invalid/inapplicable/expired discount code doesn't block checkout —
  // the checkout page already surfaces why it didn't apply (see
  // previewOrderTotalsAction); the order simply proceeds without that discount.

  const [method] = await db.select().from(paymentMethods).where(and(eq(paymentMethods.code, data.paymentMethodCode), eq(paymentMethods.isActive, true))).limit(1);
  if (!method) return { error: "Selected payment method is not available." };
  // Card / Apple Pay need the payment gateway, which isn't connected yet —
  // never create an order that looks paid-by-card but was never charged.
  if (GATEWAY_PAYMENT_METHODS.includes(data.paymentMethodCode)) {
    return { error: "Online payment isn't available yet. Please choose another payment method." };
  }
  const isWallet = WALLET_PAYMENT_METHODS.includes(data.paymentMethodCode);
  // Cash on delivery may need a deposit up front (Admin → Settings); fixed at order time.
  const depositCents =
    data.paymentMethodCode === "cash_on_delivery" ? codDepositCents(await getCodDepositSetting(), toCents(totals.grandTotal), toCents(totals.deliveryFee)) : 0;

  let customerId: number | null = null;
  if (userId) {
    const [customer] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
    customerId = customer?.id ?? null;
  } else if (data.guestContact) {
    customerId = await resolveOrCreateGuestCustomer(data.guestContact);
  }

  // ── Address resolution (delivery only) ────────────────────────────────
  let addressId: number | null = null;
  if (data.fulfillmentType === "delivery") {
    if (data.addressId) {
      // Must belong to this customer — otherwise anyone could pass an
      // arbitrary addressId and have their order shipped to/reveal a
      // stranger's saved delivery address.
      const [owned] = await db
        .select({ id: addresses.id })
        .from(addresses)
        .where(and(eq(addresses.id, data.addressId), customerId ? eq(addresses.customerId, customerId) : sql`false`))
        .limit(1);
      if (!owned) return { error: "That saved address is no longer available." };
      addressId = owned.id;
    } else if (data.newAddress) {
      const guestToken = customerId ? null : await getGuestCartToken();
      if (customerId && data.newAddress.isDefault) {
        // Only one saved address should be "the" default per customer.
        await db.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
      }
      const [row] = await db
        .insert(addresses)
        .values({ ...data.newAddress, customerId, guestToken })
        .$returningId();
      addressId = row.id;
    } else {
      return { error: "A delivery address is required." };
    }
  }

  const orderLocale: "ar" | "en" = (await getLocale()) === "en" ? "en" : "ar";

  // ── Create order ──────────────────────────────────────────────────────
  const orderNumber = generateOrderNumber();

  let orderId: number;
  try {
  orderId = await db.transaction(async (tx) => {
    const [orderRow] = await tx
      .insert(orders)
      .values({
        orderNumber,
        locale: orderLocale,
        customerId,
        // For logged-in customers this is normally redundant with their
        // account details, but for Pickup it may be a different name/phone
        // (who's actually collecting the order) — keep it whenever provided.
        guestContact: data.guestContact ?? null,
        channel: "web",
        status: "pending",
        fulfillmentType: data.fulfillmentType,
        addressId,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        deliveryFee: totals.deliveryFee,
        grandTotal: totals.grandTotal,
        depositAmount: fromCents(depositCents),
      })
      .$returningId();

    await tx.insert(orderItems).values(
      cart.lines.map((l) => ({
        orderId: orderRow.id,
        storeProductId: l.productId,
        variantId: l.variantId,
        nameSnapshot: l.name,
        variantLabelSnapshot: l.variantLabel,
        skuSnapshot: l.sku,
        unitPrice: (l.unitPriceCents / 100).toFixed(2),
        quantity: l.quantity,
        lineTotal: (l.lineTotalCents / 100).toFixed(2),
      })),
    );

    await tx.insert(orderStatusHistory).values({ orderId: orderRow.id, status: "pending", note: "Order placed." });

    if (discountResult.appliedDiscounts.length > 0) {
      // Each row gets that discount's own share (already split proportionally
      // by applyDiscountsToCart when multiple discounts stack) — not the
      // combined order total, which would over-report every discount's impact.
      await tx.insert(orderDiscounts).values(
        discountResult.appliedDiscounts.map((a) => ({
          orderId: orderRow.id,
          discountId: a.discountId,
          code: a.isCode ? codeDiscount?.code ?? null : null,
          amount: fromCents(a.amountCents),
        })),
      );
      for (const a of discountResult.appliedDiscounts) {
        await tx
          .update(discounts)
          .set({ usedCount: sql`${discounts.usedCount} + 1` })
          .where(eq(discounts.id, a.discountId));
        if (a.isCode) {
          await tx.insert(discountRedemptions).values({
            discountId: a.discountId,
            orderId: orderRow.id,
            userId,
            amount: fromCents(a.amountCents),
          });
        }
      }
    }

    await tx.insert(payments).values({
      orderId: orderRow.id,
      methodId: method.id,
      amount: totals.grandTotal,
      // Wallet transfers (InstaPay / Vodafone Cash) arrive with the proof
      // screenshot already attached (required by checkoutSchema), so they go
      // straight to "submitted" for admin review.
      status: isWallet ? "submitted" : "pending",
      proofMediaId: isWallet ? data.paymentProofMediaId : null,
    });

    for (const line of cart.lines) {
      // Guard the decrement with stockQty >= quantity so two concurrent
      // checkouts can't both pass the earlier read-only check and both
      // decrement past zero (TOCTOU race). If this doesn't match any row,
      // someone else's order already used up the remaining stock — abort
      // the whole transaction rather than sell something we don't have.
      // Stock lives on the variant when there is one, otherwise on the product.
      const [result] = line.variantId
        ? await tx
            .update(storeProductVariants)
            .set({ stockQty: sql`${storeProductVariants.stockQty} - ${line.quantity}` })
            .where(and(eq(storeProductVariants.id, line.variantId), gte(storeProductVariants.stockQty, line.quantity)))
        : await tx
            .update(storeProducts)
            .set({ stockQty: sql`${storeProducts.stockQty} - ${line.quantity}` })
            .where(and(eq(storeProducts.id, line.productId), gte(storeProducts.stockQty, line.quantity)));
      if (result.affectedRows === 0) {
        throw new Error(`${lineTitle(line)} no longer has enough stock.`);
      }
    }

    if (cart.cartId) {
      await tx.delete(cartItems).where(eq(cartItems.cartId, cart.cartId));
      await tx.update(carts).set({ status: "converted" }).where(eq(carts.id, cart.cartId));
    }

    return orderRow.id;
  });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not place your order. Please try again." };
  }

  if (!userId) await clearGuestCartCookie();
  // The code applied in the cart has been used for this order — don't carry it to the next one.
  (await cookies()).delete(CART_CODE_COOKIE);

  // After the response, once each: the customer's confirmation on WhatsApp
  // and email (cash on delivery now; InstaPay / Vodafone Cash after payment
  // approval — it carries the "create your password" link when their account
  // has none) and the store-owner's WhatsApp alert. Never affects the
  // committed order.
  triggerNewOrderWhatsApp(orderId);

  // Admin alert — configurable address in Admin → Settings. Never let a mail
  // failure affect the customer's already-committed order.
  try {
    const adminEmail = await getNotificationEmail();
    if (adminEmail) {
      let address: string | null = null;
      if (data.fulfillmentType === "delivery" && addressId) {
        const [a] = await db.select().from(addresses).where(eq(addresses.id, addressId)).limit(1);
        if (a) {
          address = [a.street, a.building && `Bldg ${a.building}`, a.floor && `Floor ${a.floor}`, a.apartment && `Apt ${a.apartment}`, a.area, a.city, governorateLabel(a.governorate, "en")]
            .filter(Boolean)
            .join(", ");
        }
      }
      const email = renderAdminNewOrderEmail({
        orderNumber,
        customerName: data.newAddress?.recipientName ?? data.guestContact?.name ?? session?.user?.name ?? null,
        customerPhone: data.newAddress?.phone ?? data.guestContact?.phone ?? null,
        customerEmail: session?.user?.email ?? (data.guestContact?.email || null),
        fulfillmentType: data.fulfillmentType,
        items: cart.lines.map((l) => ({ name: l.name, variant: l.variantLabel, quantity: l.quantity, lineTotal: fromCents(l.lineTotalCents) })),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        deliveryFee: totals.deliveryFee,
        grandTotal: totals.grandTotal,
        paymentMethodCode: data.paymentMethodCode,
        address,
        customerLocale: orderLocale,
        adminUrl: `${siteUrl()}/admin/orders/${orderId}`,
      });
      await sendEmail({ to: adminEmail, ...email });
    }
  } catch (err) {
    console.error("Admin order notification failed:", err);
  }

  return { success: true, data: { orderNumber } };
}
