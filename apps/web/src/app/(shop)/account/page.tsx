import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import Link from "@/components/LocaleLink";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { PackageSearch, MapPin, ChevronRight, LogOut } from "lucide-react";
import { formatMoney, toCents } from "@verella/core";
import { db, users, type OrderStatus } from "@verella/db";
import { getSessionUser } from "@/lib/auth/rbac";
import { getOrCreateCustomer, getCustomerOrders } from "@/lib/account/queries";
import { logoutAction } from "@/lib/auth/actions";
import { getDict, getLocale } from "@/lib/i18n";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "ready_for_pickup"];

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.account.title);
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account");

  const [locale, customer] = await Promise.all([getLocale(), getOrCreateCustomer(Number(user.id))]);
  const [orders, [dbUser]] = await Promise.all([
    getCustomerOrders(customer.id),
    db.select({ emailVerifiedAt: users.emailVerifiedAt, createdAt: users.createdAt }).from(users).where(eq(users.id, Number(user.id))).limit(1),
  ]);

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const recentOrders = orders.slice(0, 3);
  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();
  const memberSince = dbUser?.createdAt ? new Date(dbUser.createdAt).getFullYear() : null;

  return (
    <div className="min-h-screen bg-ivory">
      {/* ── Profile header ── */}
      <div className="bg-charcoal px-5 py-10 md:px-16 md:py-14">
        <div className="mx-auto flex max-w-3xl items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-charcoal font-[family-name:var(--font-display)] text-2xl font-bold text-white md:h-20 md:w-20 md:text-3xl">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold text-white md:text-3xl">
              {user.name ?? "My Account"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-white/70">{user.email}</p>
            {memberSince && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-beige">
                Member since {memberSince}
              </p>
            )}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-charcoal"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-8 md:py-10">
        {!dbUser?.emailVerifiedAt && (
          <div className="mb-6">
            <VerifyEmailBanner />
          </div>
        )}

        {/* ── Quick stats / links ── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/account/orders"
            className="group flex items-center gap-4 rounded-2xl border border-beige/60 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-beige hover:shadow-[0_10px_24px_-12px_rgba(39,25,8,0.25)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
              <PackageSearch size={20} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal">My Orders</p>
              <p className="text-sm text-on-surface-variant">
                {orders.length} total{activeOrders.length > 0 ? ` · ${activeOrders.length} active` : ""}
              </p>
            </div>
            <ChevronRight size={18} className="text-beige transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link
            href="/account/addresses"
            className="group flex items-center gap-4 rounded-2xl border border-beige/60 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-beige hover:shadow-[0_10px_24px_-12px_rgba(39,25,8,0.25)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
              <MapPin size={20} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal">Saved Addresses</p>
              <p className="text-sm text-on-surface-variant">Manage delivery addresses</p>
            </div>
            <ChevronRight size={18} className="text-beige transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {/* ── Recent orders ── */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-charcoal">Recent orders</h2>
            {orders.length > 3 && (
              <Link href="/account/orders" className="text-sm font-semibold text-gold-ink hover:underline">
                View all
              </Link>
            )}
          </div>
          {recentOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-beige bg-white/60 p-10 text-center">
              <p className="text-sm text-on-surface-variant">You haven&apos;t placed any orders yet.</p>
              <Link
                href="/store"
                className="mt-4 inline-block rounded-full bg-charcoal px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-primary-container"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => {
                const active = ACTIVE_STATUSES.includes(o.status);
                return (
                  <Link
                    key={o.id}
                    href={`/order/${o.orderNumber}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-beige/60 bg-white p-4 transition-colors hover:border-beige"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-charcoal">{o.orderNumber}</p>
                      <p className="text-xs text-on-surface-variant">{new Date(o.placedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-bold text-charcoal">{formatMoney(toCents(o.grandTotal), o.currency, locale)}</p>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          o.status === "cancelled"
                            ? "bg-red-50 text-red-700"
                            : active
                              ? "bg-gold/10 text-gold-ink"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
