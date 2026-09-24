import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { getCart } from "@/lib/cart/queries";
import { getDict, getLocale } from "@/lib/i18n";
import { CartView } from "@/components/cart/cart-view";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.cart.title);
}

export default async function CartPage() {
  const locale = await getLocale();
  const [cart, dict] = await Promise.all([getCart(locale), getDict()]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-16 md:py-16">
      <h1 className="mb-8 font-display text-3xl font-medium text-charcoal md:text-4xl">{dict.cart.title}</h1>
      <CartView lines={cart.lines} subtotalCents={cart.subtotalCents} dict={dict} locale={locale} />
    </div>
  );
}
