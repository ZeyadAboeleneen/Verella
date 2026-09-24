"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db, settings, paymentMethods } from "@verella/db";
import { GATEWAY_PAYMENT_METHODS, GOVERNORATE_NAMES, PAYMENT_METHOD_CODES, type PaymentMethodCode } from "@verella/core";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { SETTINGS_CACHE_TAG } from "@/lib/settings/queries";

export interface GovernorateFee {
  name: string;
  fee: string; // decimal string, e.g. "45.00"
}

export interface SiteSettingsInput {
  siteNameEn: string;
  siteNameAr: string;
  currency: string;
  deliveryFee: string;
  governorateFees: GovernorateFee[];
  notificationEmail: string;
  taxEnabled: boolean;
  guestCheckoutEnabled: boolean;
  pickupEnabled: boolean;
  instapayNumber: string;
  instapayName: string;
  vodafoneCashNumber: string;
  vodafoneCashName: string;
  paymentMethods: { code: PaymentMethodCode; isActive: boolean }[];
}

async function upsertSetting(group: string, key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ group, key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

const isFee = (v: string) => v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;

export async function updateSiteSettingsAction(input: SiteSettingsInput): Promise<ActionResult> {
  const guard = await guardPermission("settings.manage");
  if ("error" in guard) return guard;

  if (!isFee(input.deliveryFee.trim())) return { error: "Default delivery fee must be a number of 0 or more." };

  // Only the 27 governorates are valid keys; a blank fee means "use the default".
  const known = new Set<string>(GOVERNORATE_NAMES);
  const governorateFees = input.governorateFees
    .map((g) => ({ name: g.name.trim(), fee: g.fee.trim() }))
    .filter((g) => known.has(g.name) && isFee(g.fee))
    .map((g) => ({ name: g.name, fee: Number(g.fee).toFixed(2) }));

  const notificationEmail = input.notificationEmail.trim();
  if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    return { error: "Notification email is not a valid email address." };
  }

  const methods = input.paymentMethods.filter((m) => (PAYMENT_METHOD_CODES as readonly string[]).includes(m.code));
  // Card / Apple Pay can't take real payments until the gateway is connected.
  if (methods.some((m) => m.isActive && GATEWAY_PAYMENT_METHODS.includes(m.code))) {
    return { error: "Card and Apple Pay need the online payment gateway to be connected first." };
  }
  if (!methods.some((m) => m.isActive)) return { error: "Keep at least one payment method switched on." };

  await Promise.all([
    upsertSetting("site", "name", { en: input.siteNameEn, ar: input.siteNameAr }),
    upsertSetting("site", "currency", input.currency),
    upsertSetting("checkout", "delivery_fee", Number(input.deliveryFee).toFixed(2)),
    upsertSetting("checkout", "governorate_fees", governorateFees),
    upsertSetting("notifications", "email", notificationEmail),
    upsertSetting("checkout", "tax_enabled", input.taxEnabled),
    upsertSetting("checkout", "guest_checkout_enabled", input.guestCheckoutEnabled),
    upsertSetting("checkout", "fulfillment_types", input.pickupEnabled ? ["delivery", "pickup"] : ["delivery"]),
    upsertSetting("checkout", "instapay_number", input.instapayNumber.trim()),
    upsertSetting("checkout", "instapay_name", input.instapayName.trim()),
    upsertSetting("checkout", "vodafone_cash_number", input.vodafoneCashNumber.trim()),
    upsertSetting("checkout", "vodafone_cash_name", input.vodafoneCashName.trim()),
    ...methods.map((m) => db.update(paymentMethods).set({ isActive: m.isActive }).where(eq(paymentMethods.code, m.code))),
  ]);

  await logActivity({ actorUserId: Number(guard.id), action: "settings.updated", entityType: "settings" });
  updateTag(SETTINGS_CACHE_TAG);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  return { success: true };
}
