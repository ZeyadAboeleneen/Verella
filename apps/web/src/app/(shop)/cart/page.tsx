import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { getCart } from "@/lib/cart/queries";
import { getDict, getLocale } from "@/lib/i18n";
import { CartView } from "@/components/cart/cart-view";
import { applyDiscountsToCart } from "@verella/core";
import { getAutoDiscounts } from "@/lib/discounts/resolve";
import { applyAutoDiscount } from "@/lib/store/queries";
import { cookies } from "next/headers";
import { previewOrderTotalsAction } from "@/lib/checkout/actions";
import { CART_CODE_COOKIE } from "@/lib/cart/discount-code-cookie";
import { getFreeShippingThresholdCents } from "@/lib/checkout/free-shipping";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.cart.title);
}

export default async function CartPage() {
  const locale = await getLocale();
  const [cart, dict, autoDiscounts, freeShippingFromCents] = await Promise.all([
    getCart(locale),
    getDict(),
    getAutoDiscounts().catch(() => []),
    getFreeShippingThresholdCents().catch(() => 0),
  ]);

  // Automatic discounts (no code). The cart keeps the regular price and the
  // order applies the discount at checkout — show it here too, using the
  // checkout calculation for the total so both pages always agree.
  const discountedUnits = Object.fromEntries(
    cart.lines.map((l) => [l.id, applyAutoDiscount(l.unitPriceCents, l.categoryIds, l.productId, autoDiscounts)]),
  );
  const { discountTotalCents } = applyDiscountsToCart(
    cart.lines.map((l) => ({ productId: l.productId, categoryId: l.categoryId, categoryIds: l.categoryIds, unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    autoDiscounts,
    null,
  );

  // A code applied in the cart (remembered for checkout). Totals come from the
  // checkout calculation; the code's share is what it adds on top of the automatic ones.
  const code = (await cookies()).get(CART_CODE_COOKIE)?.value ?? null;
  let codeDiscountCents = 0;
  let codeError: string | undefined;
  if (code && cart.lines.length > 0) {
    const preview = await previewOrderTotalsAction("pickup", code);
    if ("error" in preview) codeError = preview.error;
    else if (preview.data.discountError) codeError = preview.data.discountError;
    else codeDiscountCents = Math.max(0, preview.data.discountTotalCents - discountTotalCents);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-16 md:py-16">
      <h1 className="mb-8 font-display text-3xl font-medium text-charcoal md:text-4xl">{dict.cart.title}</h1>
      <CartView
        lines={cart.lines}
        subtotalCents={cart.subtotalCents}
        discountedUnits={discountedUnits}
        discountTotalCents={discountTotalCents}
        appliedCode={code}
        codeDiscountCents={codeDiscountCents}
        codeError={codeError}
        freeShippingFromCents={freeShippingFromCents}
        dict={dict}
        locale={locale}
      />
    </div>
  );
}
