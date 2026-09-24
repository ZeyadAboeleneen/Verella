"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/LocaleLink";
import Image from "next/image";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { updateCartItemQuantityAction, removeCartItemAction } from "@/lib/cart/actions";
import { formatMoney } from "@verella/core";
import type { CartLineView } from "@/lib/cart/queries";
import type { Dictionary, Locale } from "@/lib/i18n";
import { VMark } from "@/components/brand/Logo";

export function CartView({
  lines,
  subtotalCents,
  dict,
  locale,
}: {
  lines: CartLineView[];
  subtotalCents: number;
  dict: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyLine, setBusyLine] = useState<number | null>(null);
  const [error, setError] = useState<{ lineId: number; message: string } | null>(null);
  const money = (cents: number) => formatMoney(cents, "EGP", locale);

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
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-charcoal px-8 text-xs font-medium uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-primary-container"
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
                    <p className="mt-1 text-sm text-on-surface-variant">{money(line.unitPriceCents)}</p>
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
                  <p className="whitespace-nowrap font-medium text-charcoal">{money(line.lineTotalCents)}</p>
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
        <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{dict.cart.shippingNote}</p>
        <Link
          href="/checkout"
          className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-charcoal text-xs font-medium uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-primary-container"
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
