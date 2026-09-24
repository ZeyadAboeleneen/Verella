import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import Link from "@/components/LocaleLink";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { formatMoney, toCents } from "@verella/core";
import type { OrderStatus } from "@verella/db";
import { getSessionUser } from "@/lib/auth/rbac";
import { getOrCreateCustomer, getCustomerOrders } from "@/lib/account/queries";
import { getDict, getLocale } from "@/lib/i18n";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.account.title);
}

export default async function AccountOrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/orders");

  const [locale, customer] = await Promise.all([getLocale(), getOrCreateCustomer(Number(user.id))]);
  const orders = await getCustomerOrders(customer.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-16 md:py-16">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ChevronLeft size={16} /> My Account
      </Link>
      <h1 className="mb-8 font-display text-2xl font-bold text-on-surface">My Orders</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-10 text-center">
          <p className="text-on-surface-variant">You haven&apos;t placed any orders yet.</p>
          <Link href="/store" className="mt-4 inline-block font-semibold text-primary hover:underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/order/${o.orderNumber}`}
              className="flex items-center justify-between rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-on-surface">{o.orderNumber}</p>
                <p className="text-xs text-on-surface-variant">{new Date(o.placedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-end">
                <p className="font-semibold text-on-surface">{formatMoney(toCents(o.grandTotal), o.currency, locale)}</p>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant">
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
