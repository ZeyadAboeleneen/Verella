import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import Link from "@/components/LocaleLink";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth/rbac";
import { getOrCreateCustomer, getCustomerAddresses } from "@/lib/account/queries";
import { AddressManager } from "@/components/account/address-manager";
import { getDict, getLocale } from "@/lib/i18n";
import type { GovernorateName } from "@verella/core";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.account.title);
}

export default async function AccountAddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/addresses");

  const locale = await getLocale();
  const customer = await getOrCreateCustomer(Number(user.id));
  const addresses = await getCustomerAddresses(customer.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-16 md:py-16">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ChevronLeft size={16} /> My Account
      </Link>
      <h1 className="mb-8 font-display text-2xl font-bold text-on-surface">Saved Addresses</h1>
      <AddressManager
        locale={locale}
        initialAddresses={addresses.map((a) => ({
          id: a.id,
          label: a.label ?? undefined,
          recipientName: a.recipientName,
          phone: a.phone,
          // Validated against the governorate list on every write.
          governorate: a.governorate as GovernorateName,
          city: a.city ?? undefined,
          area: a.area ?? undefined,
          street: a.street,
          building: a.building ?? undefined,
          floor: a.floor ?? undefined,
          apartment: a.apartment ?? undefined,
          landmark: a.landmark ?? undefined,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
