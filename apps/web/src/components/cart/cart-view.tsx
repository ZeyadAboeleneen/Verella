"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/LocaleLink";
import Image from "next/image";
import { ArrowRight, Loader2, Minus, Plus, Tag, X } from "lucide-react";
import { updateCartItemQuantityAction, removeCartItemAction } from "@/lib/cart/actions";
import { applyCartDiscountCodeAction, removeCartDiscountCodeAction } from "@/lib/cart/discount-code";
import { formatMoney } from "@verella/core";
import type { CartLineView } from "@/lib/cart/queries";
import type { Dictionary, Locale } from "@/lib/i18n";
import { VMark } from "@/components/brand/Logo";
import { FreeShippingProgress } from "@/components/cart/free-shipping-progress";

export function CartView({
  lines,
  subtotalCents,
  freeShippingFromCents = 0,
  discountedUnits = {},
  discountTotalCents = 0,
  appliedCode = null,
  codeDiscountCents = 0,
  codeError,
  dict,
  locale,
}: {
  lines: CartLineView[];
  subtotalCents: number;
  /** Free-delivery threshold from settings; 0 = off. */
  freeShippingFromCents?: number;
  /** line id → unit price after automatic discounts. */
  discountedUnits?: Record<number, number>;
  /** Total automatic discount, as checkout computes it. */
  discountTotalCents?: number;
  /** Code applied in the cart (remembered for checkout), its extra saving, or why it doesn't apply. */
  appliedCode?: string | null;
  codeDiscountCents?: number;
  codeError?: string;
  dict: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyLine, setBusyLine] = useState<number | null>(null);
  const [error, setError] = useState<{ lineId: number; message: string } | null>(null);
  const money = (cents: number) => formatMoney(cents, "EGP", locale);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, startCode] = useTransition();
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const totalAfter = subtotalCents - discountTotalCents - codeDiscountCents;

  function applyCode() {
    setCodeMsg(null);
    startCode(async () => {
      const res = await applyCartDiscountCodeAction(codeInput);
      if ("error" in res) setCodeMsg(res.error);
      else setCodeInput("");
      router.refresh();
    });
  }
  function removeCode() {
    startCode(async () => {
      await removeCartDiscountCodeAction();
      router.refresh();
    });
  }

  function run(lineId: number, action: () => Promise<{ error: string } | { success: true }>) {
    setError(null);
    setBusyLine(lineId);
    startTransition(async () => {
      const res = await action();
      if ("error" in res) setError({ lineId, message: res.error });
      router.refresh();
      setBusyLine(null);
    });
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <VMark size={48} className="mb-6 text-beige" />
        <p className="text-lg text-charcoal">{dict.cart.empty}</p>
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">{dict.cart.emptyHint}</p>
        <Link
          href="/store"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-plum px-8 text-xs font-medium uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-plum-deep"
        >
          {dict.cart.continueShopping}
          <ArrowRight size={14} className="rtl:rotate-180" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <ul className="divide-y divide-beige border-y border-beige lg:col-span-2">
        {lines.map((line) => {
          const busy = pending && busyLine === line.id;
          return (
            <li key={line.id} className={`flex gap-4 py-5 transition-opacity duration-300 ${busy ? "opacity-50" : ""}`}>
              <Link
                href={`/store/${line.slug}`}
                className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-container"
              >
                {line.image ? (
                  <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <VMark size={28} className="text-beige" />
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/store/${line.slug}`} className="line-clamp-2 text-charcoal hover:underline">
                      {line.name}
                    </Link>
                    {line.variantLabel && (
                      <p className="mt-1 text-xs uppercase tracking-[0.15em] text-on-surface-variant">{line.variantLabel}</p>
                    )}
                    {(() => {
                      const unit = discountedUnits[line.id] ?? line.unitPriceCents;
                      return unit < line.unitPriceCents ? (
                        <p className="mt-1 flex items-baseline gap-2 text-sm">
                          <span className="font-medium text-charcoal">{money(unit)}</span>
                          <span className="text-xs text-on-surface-variant line-through">{money(line.unitPriceCents)}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-on-surface-variant">{money(line.unitPriceCents)}</p>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(line.id, () => removeCartItemAction(line.id))}
                    aria-label={`${dict.cart.remove} ${line.name}`}
                    className="-me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-charcoal"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <div className="flex items-center gap-1 rounded-full border border-outline-variant px-1 py-0.5">
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`${dict.cart.quantity} −`}
                      onClick={() => run(line.id, () => updateCartItemQuantityAction(line.id, line.quantity - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-surface-container disabled:opacity-40"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      disabled={pending || line.quantity >= line.stockQty}
                      aria-label={`${dict.cart.quantity} +`}
                      onClick={() => run(line.id, () => updateCartItemQuantityAction(line.id, line.quantity + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-surface-container disabled:opacity-40"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <p className="whitespace-nowrap font-medium text-charcoal">{money((discountedUnits[line.id] ?? line.unitPriceCents) * line.quantity)}</p>
                </div>
                {error?.lineId === line.id && <p className="mt-2 text-xs text-error">{error.message}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl bg-surface-container-low p-6 lg:sticky lg:top-[calc(var(--nav-offset,72px)+24px)]">
        <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-charcoal">{dict.checkout.orderSummary}</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">{dict.cart.subtotal}</span>
          <span className="font-medium text-charcoal">{money(subtotalCents)}</span>
        </div>
        {discountTotalCents > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">{dict.checkout.discount}</span>
            <span className="font-medium text-gold-ink">−{money(discountTotalCents)}</span>
          </div>
        )}
        {appliedCode && codeDiscountCents > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-on-surface-variant">
              <Tag size={12} className="text-gold-ink" aria-hidden="true" />
              <span dir="ltr" className="font-semibold tracking-wide text-charcoal">{appliedCode}</span>
            </span>
            <span className="font-medium text-gold-ink">−{money(codeDiscountCents)}</span>
          </div>
        )}
        {(discountTotalCents > 0 || codeDiscountCents > 0) && (
          <div className="mt-3 flex items-center justify-between border-t border-[rgba(20,20,20,0.1)] pt-3 text-sm">
            <span className="font-medium text-charcoal">{dict.checkout.total}</span>
            <span className="text-base font-semibold text-charcoal">{money(totalAfter)}</span>
          </div>
        )}

        {/* Discount code — applied here, carried over to checkout. */}
        <div className="mt-5 border-t border-[rgba(20,20,20,0.1)] pt-4">
          {appliedCode ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-lowest px-3 py-2.5 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <Tag size={13} className="shrink-0 text-gold-ink" aria-hidden="true" />
                <span dir="ltr" className="truncate font-semibold tracking-wide text-charcoal">{appliedCode}</span>
              </span>
              <button type="button" onClick={removeCode} disabled={codeBusy} aria-label={dict.cart.remove} className="text-on-surface-variant hover:text-charcoal disabled:opacity-40">
                {codeBusy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyCode();
              }}
              className="flex gap-2"
            >
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder={dict.checkout.codePlaceholder}
                aria-label={dict.checkout.discountCode}
                dir="ltr"
                className="h-10 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm uppercase text-charcoal outline-none focus:border-charcoal"
              />
              <button
                type="submit"
                disabled={codeBusy || !codeInput.trim()}
                className="flex h-10 items-center rounded-xl border border-charcoal px-4 text-xs font-medium uppercase tracking-[0.15em] text-charcoal transition-colors hover:bg-plum hover:text-ivory disabled:opacity-40"
              >
                {codeBusy ? <Loader2 size={14} className="animate-spin" /> : dict.checkout.apply}
              </button>
            </form>
          )}
          {(codeMsg || codeError) && <p className="mt-2 text-xs text-error">{codeMsg ?? codeError}</p>}
        </div>
        <div className="mt-4">
          <FreeShippingProgress
            thresholdCents={freeShippingFromCents}
            amountCents={totalAfter}
            remainingLabel={dict.cart.freeShippingRemaining}
            unlockedLabel={dict.cart.freeShippingUnlocked}
            money={money}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{dict.cart.shippingNote}</p>
        <Link
          href="/checkout"
          className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-plum text-xs font-medium uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-plum-deep"
        >
          {dict.cart.checkout}
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </Link>
        <Link
          href="/store"
          className="mt-4 block text-center text-xs text-on-surface-variant underline-offset-4 hover:text-charcoal hover:underline"
        >
          {dict.cart.continueShopping}
        </Link>
      </aside>
    </div>
  );
}
