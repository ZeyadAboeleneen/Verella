"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { updateCartItemQuantityAction, removeCartItemAction } from "@/lib/cart/actions";
import { formatMoney } from "@verella/core";
import type { CartLineView } from "@/lib/cart/queries";
import type { Dictionary } from "@/lib/i18n";

export function CartView({ lines, subtotalCents, dict }: { lines: CartLineView[]; subtotalCents: number; dict: Dictionary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setQuantity(lineId: number, quantity: number) {
    startTransition(async () => {
      await updateCartItemQuantityAction(lineId, quantity);
      router.refresh();
    });
  }

  function remove(lineId: number) {
    startTransition(async () => {
      await removeCartItemAction(lineId);
      router.refresh();
    });
  }

  if (lines.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-on-surface-variant">{dict.cart.empty}</p>
        <Link href="/store" className="mt-4 inline-block font-semibold text-primary hover:underline">
          {dict.cart.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {lines.map((line) => (
          <div key={line.id} className="flex gap-3 sm:gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-3 sm:p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container">
              {line.image && <Image src={line.image} alt={line.name} fill className="object-cover" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-on-surface">{line.name}</p>
                  <p className="text-sm text-on-surface-variant">{formatMoney(line.unitPriceCents)}</p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(line.id)}
                  aria-label={`Remove ${line.name}`}
                  className="shrink-0 p-1 text-error hover:opacity-70"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setQuantity(line.id, line.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-50"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    disabled={pending || line.quantity >= line.stockQty}
                    onClick={() => setQuantity(line.id, line.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface disabled:opacity-50"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <p className="whitespace-nowrap font-semibold text-on-surface">{formatMoney(line.lineTotalCents)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6">
        <div className="flex items-center justify-between text-sm text-on-surface-variant">
          <span>{dict.cart.subtotal}</span>
          <span className="font-semibold text-on-surface">{formatMoney(subtotalCents)}</span>
        </div>
        <Link
          href="/checkout"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary hover:opacity-90"
        >
          {dict.cart.checkout}
        </Link>
      </div>
    </div>
  );
}
