import { db, settings } from "@verella/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import type { GovernorateFee } from "@/lib/settings/actions";

export default async function AdminSettingsPage() {
  const rows = await withDbTimeout(db.select().from(settings)).catch(() => null);

  if (rows === null) {
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
          notificationEmail: (find("notifications", "email") as string) ?? "zeyad5zoks@gmail.com",
          taxEnabled: Boolean(find("checkout", "tax_enabled")),
          guestCheckoutEnabled: find("checkout", "guest_checkout_enabled") !== false,
          instapayNumber: (find("checkout", "instapay_number") as string) ?? "",
          instapayName: (find("checkout", "instapay_name") as string) ?? "",
        }}
      />
    </div>
  );
}
