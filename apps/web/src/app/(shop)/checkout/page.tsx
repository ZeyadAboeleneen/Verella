import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, paymentMethods, users } from "@verella/db";
import { getCart } from "@/lib/cart/queries";
import { getSessionUser } from "@/lib/auth/rbac";
import { getDict, getLocale } from "@/lib/i18n";
import { getFulfillmentTypes, getWalletDetails, isGuestCheckoutEnabled } from "@/lib/settings/queries";
import { PAYMENT_METHOD_CODES, type PaymentMethodCode } from "@verella/core";
import { getCustomerAddresses } from "@/lib/addresses/queries";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.checkout.title);
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const [cart, user, methods, dict, wallets, guestCheckoutEnabled, fulfillmentTypes] = await Promise.all([
    getCart(locale),
    getSessionUser(),
    db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(asc(paymentMethods.sortOrder)),
    getDict(),
    getWalletDetails(),
    isGuestCheckoutEnabled(),
    getFulfillmentTypes(),
  ]);
  const activeMethods = methods
    .map((m) => m.code)
    .filter((code): code is PaymentMethodCode => (PAYMENT_METHOD_CODES as readonly string[]).includes(code));

  if (cart.lines.length === 0) redirect("/cart");
  if (!user && !guestCheckoutEnabled) redirect("/login?callbackUrl=/checkout");

  // SessionUser doesn't carry phone — pull it (plus a name/email fallback)
  // straight from the account so the Pickup contact card can be prefilled
  // even when logged in, without forcing a re-type.
  let accountContact: { name: string; phone: string; email: string } | null = null;
  let savedAddresses: Awaited<ReturnType<typeof getCustomerAddresses>> = [];
  if (user) {
    const [row] = await db.select({ fullName: users.fullName, phone: users.phone, email: users.email }).from(users).where(eq(users.id, Number(user.id))).limit(1);
    if (row) accountContact = { name: row.fullName, phone: row.phone ?? "", email: row.email };
    savedAddresses = await getCustomerAddresses(Number(user.id));
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:px-16 md:py-16">
      <h1 className="mb-8 font-display text-3xl font-medium text-charcoal md:text-4xl">{dict.checkout.title}</h1>
      <CheckoutForm
        isLoggedIn={!!user}
        accountContact={accountContact}
        savedAddresses={savedAddresses}
        wallets={wallets}
        paymentMethods={activeMethods}
        fulfillmentTypes={fulfillmentTypes}
        dict={dict}
        locale={locale}
        cartLines={cart.lines}
        initialSubtotalCents={cart.subtotalCents}
      />
    </div>
  );
}
