"use server";

import { revalidatePath } from "next/cache";
import { db, settings } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";

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
  instapayNumber: string;
  instapayName: string;
}

async function upsertSetting(group: string, key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ group, key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

export async function updateSiteSettingsAction(input: SiteSettingsInput): Promise<ActionResult> {
  const guard = await guardPermission("settings.manage");
  if ("error" in guard) return guard;

  const governorateFees = input.governorateFees
    .map((g) => ({ name: g.name.trim(), fee: g.fee.trim() }))
    .filter((g) => g.name && g.fee && Number.isFinite(Number(g.fee)) && Number(g.fee) >= 0);

  const notificationEmail = input.notificationEmail.trim();
  if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    return { error: "Notification email is not a valid email address." };
  }

  await Promise.all([
    upsertSetting("site", "name", { en: input.siteNameEn, ar: input.siteNameAr }),
    upsertSetting("site", "currency", input.currency),
    upsertSetting("checkout", "delivery_fee", input.deliveryFee),
    upsertSetting("checkout", "governorate_fees", governorateFees),
    upsertSetting("notifications", "email", notificationEmail),
    upsertSetting("checkout", "tax_enabled", input.taxEnabled),
    upsertSetting("checkout", "guest_checkout_enabled", input.guestCheckoutEnabled),
    upsertSetting("checkout", "instapay_number", input.instapayNumber.trim()),
    upsertSetting("checkout", "instapay_name", input.instapayName.trim()),
  ]);

  await logActivity({ actorUserId: Number(guard.id), action: "settings.updated", entityType: "settings" });
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  return { success: true };
}
