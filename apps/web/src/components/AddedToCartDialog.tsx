"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ShoppingCart, X } from "lucide-react";

export function AddedToCartDialog({
  open,
  onClose,
  productName,
  productImage,
  productMeta,
  labels,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  productName?: string;
  productImage?: string | null;
  productMeta?: string;
  labels: { title: string; continueShopping: string; goToCart: string };
  locale?: string;
}) {
  if (!open) return null;

  const isArabic = locale === "ar";

  return (
    <div
      role="status"
      dir={isArabic ? "rtl" : "ltr"}
      style={{ right: 0, left: "auto" }}
      className="absolute top-full right-0 mt-2 z-[9999] w-[calc(100vw-32px)] max-w-[320px] rounded-2xl border border-[#e8d5bc] bg-white p-3.5 sm:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 size={18} className="shrink-0 text-[#2e7d32] sm:size-5" />
          <p className="truncate font-[family-name:var(--font-plus-jakarta)] text-xs font-bold text-[#000000] sm:text-sm">
            {labels.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8E7B6A] hover:bg-[#FCE8CD]/60 active:scale-95 transition-all"
        >
          <X size={15} />
        </button>
      </div>

      {(productImage || productName) && (
        <div className="flex items-center gap-2.5 pb-3 sm:gap-3">
          {productImage && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#FCE8CD] sm:h-14 sm:w-14 border border-[#e8d5bc]/60">
              <Image src={productImage} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {productName && <p className="truncate text-xs font-bold text-[#57392D] sm:text-sm">{productName}</p>}
            {productMeta && <p className="truncate text-[11px] text-[#8E7B6A] font-medium sm:text-xs mt-0.5">{productMeta}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <Link
          href="/cart"
          onClick={onClose}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#57392D] text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#412B22] active:scale-95 transition-all"
        >
          <ShoppingCart size={15} />
          {labels.goToCart}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-full items-center justify-center rounded-full border border-[#57392D]/30 text-xs font-bold uppercase tracking-wider text-[#57392D] hover:bg-[#FAECD2]/50 active:scale-95 transition-all"
        >
          {labels.continueShopping}
        </button>
      </div>
    </div>
  );
}
