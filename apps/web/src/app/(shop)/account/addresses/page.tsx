import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth/rbac";
import { getOrCreateCustomer, getCustomerAddresses } from "@/lib/account/queries";
import { AddressManager } from "@/components/account/address-manager";

export default async function AccountAddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/addresses");

  const customer = await getOrCreateCustomer(Number(user.id));
  const addresses = await getCustomerAddresses(customer.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-16 md:py-16">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ChevronLeft size={16} /> My Account
      </Link>
      <h1 className="mb-8 font-display text-2xl font-bold text-on-surface">Saved Addresses</h1>
      <AddressManager
        initialAddresses={addresses.map((a) => ({
          id: a.id,
          label: a.label ?? undefined,
          recipientName: a.recipientName,
          phone: a.phone,
          governorate: a.governorate,
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
