"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db, settings, paymentMethods } from "@verella/db";
import { GATEWAY_PAYMENT_METHODS, GOVERNORATE_NAMES, PAYMENT_METHOD_CODES, type PaymentMethodCode } from "@verella/core";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { SETTINGS_CACHE_TAG } from "@/lib/settings/queries";
import { SITE_THEMES, type SiteTheme } from "@/lib/settings/theme";
import { normalizeEgyptianPhone } from "@/lib/whatsapp/phone";

export interface GovernorateFee {
  name: string;
  fee: string; // decimal string, e.g. "45.00"
}

export interface SiteSettingsInput {
  siteNameEn: string;
  siteNameAr: string;
  theme: SiteTheme;
  currency: string;
  deliveryFee: string;
  /** Orders at or above this amount (after discounts) ship free; empty = off. */
  freeShippingThreshold: string;
  /** Cash-on-delivery deposit: off, a % of the order total, or a fixed amount. */
  codDepositType: "off" | "percent" | "fixed";
  codDepositValue: string;
  governorateFees: GovernorateFee[];
  notificationEmail: string;
  /** WhatsApp number for new-order alerts; empty disables them. */
  notificationWhatsApp: string;
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
  const freeShippingThreshold = input.freeShippingThreshold.trim();
  if (freeShippingThreshold && !(isFee(freeShippingThreshold) && Number(freeShippingThreshold) > 0)) {
    return { error: "Free delivery amount must be a number above 0 (or leave it empty to turn it off)." };
  }

  // Only the 27 governorates are valid keys; a blank fee means "use the default".
  const known = new Set<string>(GOVERNORATE_NAMES);
  const governorateFees = input.governorateFees
    .map((g) => ({ name: g.name.trim(), fee: g.fee.trim() }))
    .filter((g) => known.has(g.name) && isFee(g.fee))
    .map((g) => ({ name: g.name, fee: Number(g.fee).toFixed(2) }));

  const codDepositType = input.codDepositType === "percent" || input.codDepositType === "fixed" ? input.codDepositType : "off";
  const codDepositValue = input.codDepositValue.trim();
  if (codDepositType !== "off") {
    const n = Number(codDepositValue);
    if (!codDepositValue || !Number.isFinite(n) || n <= 0) return { error: "Cash on delivery deposit must be a number above 0." };
    if (codDepositType === "percent" && n > 100) return { error: "Deposit percentage can't be more than 100." };
  }

  const notificationEmail = input.notificationEmail.trim();
  const notificationWhatsApp = input.notificationWhatsApp.trim();
  const whatsAppIntl = normalizeEgyptianPhone(notificationWhatsApp);
  if (notificationWhatsApp && !whatsAppIntl) {
    return { error: "New-order WhatsApp number must be an Egyptian mobile number, e.g. 01012345678." };
  }

  if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    return { error: "Notification email is not a valid email address." };
  }

  const methods = input.paymentMethods.filter((m) => (PAYMENT_METHOD_CODES as readonly string[]).includes(m.code));
  // Card / Apple Pay can't take real payments until the gateway is connected.
  if (methods.some((m) => m.isActive && GATEWAY_PAYMENT_METHODS.includes(m.code))) {
    return { error: "Card and Apple Pay need the online payment gateway to be connected first." };
  }
  if (!methods.some((m) => m.isActive)) return { error: "Keep at least one payment method switched on." };

  const theme = (SITE_THEMES as readonly string[]).includes(input.theme) ? input.theme : "classic";

  await Promise.all([
    upsertSetting("site", "name", { en: input.siteNameEn, ar: input.siteNameAr }),
    upsertSetting("site", "theme", theme),
    upsertSetting("site", "currency", input.currency),
    upsertSetting("checkout", "delivery_fee", Number(input.deliveryFee).toFixed(2)),
    upsertSetting("checkout", "governorate_fees", governorateFees),
    upsertSetting("checkout", "cod_deposit", { type: codDepositType, value: codDepositType === "off" ? "" : String(Number(codDepositValue)) }),
    upsertSetting("checkout", "free_shipping_threshold", freeShippingThreshold ? Number(freeShippingThreshold).toFixed(2) : ""),
    upsertSetting("notifications", "email", notificationEmail),
    // Stored in local form (01012345678) so it reads naturally when edited again.
    upsertSetting("notifications", "whatsapp_phone", whatsAppIntl ? `0${whatsAppIntl.slice(2)}` : ""),
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
