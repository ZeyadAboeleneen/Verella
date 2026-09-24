import { asc } from "drizzle-orm";
import { db, settings, paymentMethods } from "@verella/db";
import { PAYMENT_METHOD_CODES, type PaymentMethodCode } from "@verella/core";
import { BRAND_CONTACT } from "@/lib/brand";
import { withDbTimeout } from "@/lib/db-timeout";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import type { GovernorateFee } from "@/lib/settings/actions";

export default async function AdminSettingsPage() {
  const [rows, methods] = await Promise.all([
    withDbTimeout(db.select().from(settings)).catch(() => null),
    withDbTimeout(db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder))).catch(() => null),
  ]);

  if (rows === null || methods === null) {
    return (
      <div>
        <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Settings</h1>
        <p className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
          Couldn&apos;t reach the database — refresh the page to try again.
        </p>
      </div>
    );
  }

  const find = (group: string, key: string) => rows.find((r) => r.group === group && r.key === key)?.value;

  const siteName = (find("site", "name") as { en?: string; ar?: string } | undefined) ?? {};
  const rawFees = find("checkout", "governorate_fees");
  const governorateFees: GovernorateFee[] = Array.isArray(rawFees)
    ? rawFees.filter((g): g is GovernorateFee => typeof g?.name === "string" && typeof g?.fee === "string")
    : [];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Settings</h1>
      <SettingsForm
        initial={{
          siteNameEn: siteName.en ?? "Verella",
          siteNameAr: siteName.ar ?? "",
          currency: (find("site", "currency") as string) ?? "EGP",
          deliveryFee: (find("checkout", "delivery_fee") as string) ?? "30.00",
          governorateFees,
          notificationEmail: (find("notifications", "email") as string) ?? BRAND_CONTACT.email.address,
          taxEnabled: Boolean(find("checkout", "tax_enabled")),
          guestCheckoutEnabled: find("checkout", "guest_checkout_enabled") !== false,
          instapayNumber: (find("checkout", "instapay_number") as string) ?? "",
          instapayName: (find("checkout", "instapay_name") as string) ?? "",
          vodafoneCashNumber: (find("checkout", "vodafone_cash_number") as string) ?? "",
          vodafoneCashName: (find("checkout", "vodafone_cash_name") as string) ?? "",
          pickupEnabled: Array.isArray(find("checkout", "fulfillment_types")) && (find("checkout", "fulfillment_types") as string[]).includes("pickup"),
          paymentMethods: methods
            .filter((m): m is typeof m & { code: PaymentMethodCode } => (PAYMENT_METHOD_CODES as readonly string[]).includes(m.code))
            .map((m) => ({ code: m.code, isActive: m.isActive })),
        }}
      />
    </div>
  );
}
