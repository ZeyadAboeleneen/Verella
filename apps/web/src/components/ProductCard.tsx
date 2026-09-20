"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCartAction } from "@/lib/cart/actions";
import { notifyAddedToCart } from "@/lib/cart/added-to-cart-bus";
import { ShoppingCart, Check } from "lucide-react";

interface ProductCardProps {
  productId?: number;
  slug?: string;
  name: string;
  price: string;
  compareAtPrice?: string | null;
  rating: number | null;
  tag: string;
  badge?: string;
  image: string;
  alt: string;
  addToCartLabel?: string;
  addedLabel?: string;
}

export default function ProductCard({
  productId,
  slug,
  name,
  price,
  compareAtPrice,
  rating,
  tag,
  badge,
  image,
  alt,
  addToCartLabel = "Add to Cart",
  addedLabel = "Added ✓",
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddToCart() {
    if (!productId) return;
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(productId, 1);
      if ("error" in res) {
        setError(res.error);
        setTimeout(() => setError(null), 3000);
      } else {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
        notifyAddedToCart({ name, image, meta: [tag, price].filter(Boolean).join(" · ") });
      }
    });
  }

  const ImageBlock = (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#FCE8CD] flex-shrink-0">
      {!imgError && image ? (
        <Image
          src={image}
          alt={alt}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[#8E7B6A] text-5xl sm:text-6xl">local_cafe</span>
        </div>
      )}
      {badge && (
        <span className="absolute top-2.5 start-2.5 sm:top-4 sm:start-4 bg-[#57392D] text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs uppercase tracking-tight">
          {badge}
        </span>
      )}
      {rating != null && (
        <span className="absolute bottom-2.5 end-2.5 sm:bottom-3 sm:end-3 flex items-center gap-0.5 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-[#000000]">
          <span aria-hidden="true" className="flex items-center gap-0.5">
            {rating}
            <span
              className="material-symbols-outlined text-[12px] sm:text-[14px] text-[#57392D]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          </span>
          <span className="sr-only">{rating} out of 5 stars</span>
        </span>
      )}
    </div>
  );

  const InfoBlock = (
    <div>
      <p className="text-[#8E7B6A] text-[10px] sm:text-xs uppercase tracking-wider mb-1">{tag}</p>
      <h3 className="font-[family-name:var(--font-plus-jakarta)] text-sm sm:text-lg font-semibold text-[#000000] leading-snug line-clamp-2 min-h-[2.5rem] sm:min-h-[3.25rem]">
        {name}
      </h3>
    </div>
  );

  return (
    <div className="group luxury-shadow bg-[#FAECD2] rounded-2xl sm:rounded-[1.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-14px_rgba(39,25,8,0.3)] flex flex-col">
      {slug ? (
        <Link href={`/store/${slug}`}>{ImageBlock}</Link>
      ) : (
        ImageBlock
      )}
      <div className="p-3 sm:p-5 flex flex-col flex-1 gap-2 sm:gap-3">
        {slug ? <Link href={`/store/${slug}`}>{InfoBlock}</Link> : InfoBlock}

        <div className="mt-auto">
          {/* Mobile: price + round icon button. Desktop: price row, then full-width CTA. */}
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-baseline gap-1.5 sm:gap-2">
              <span className={`font-[family-name:var(--font-plus-jakarta)] text-base sm:text-xl font-bold ${compareAtPrice ? "text-red-600" : "text-[#57392D]"}`}>
                {price}
              </span>
              {compareAtPrice && (
                <span className="text-[#8E7B6A] text-xs sm:text-sm line-through">{compareAtPrice}</span>
              )}
            </p>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={pending || !productId}
              aria-label={added ? addedLabel : addToCartLabel}
              className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#000000] text-white active:scale-95 transition-all disabled:opacity-60"
            >
              {added ? <Check size={18} /> : <ShoppingCart size={18} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={pending || !productId}
            className="hidden sm:flex mt-3 w-full items-center justify-center gap-2 rounded-full bg-[#000000] py-3 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#57392D] disabled:opacity-60"
          >
            {added ? addedLabel : addToCartLabel}
            {added ? <Check size={18} /> : <ShoppingCart size={18} />}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-[11px] sm:text-xs leading-snug text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
