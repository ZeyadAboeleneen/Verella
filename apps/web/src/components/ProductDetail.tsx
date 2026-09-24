"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCartAction } from "@/lib/cart/actions";
import { notifyAddedToCart } from "@/lib/cart/added-to-cart-bus";
import type { StoreProductDetailView } from "@/lib/store/queries";
import type { Dictionary } from "@/lib/i18n";
import { VMark } from "@/components/brand/Logo";

const LOW_STOCK_THRESHOLD = 5;

export function ProductDetail({ product, dict }: { product: StoreProductDetailView; dict: Dictionary["product"] }) {
  const validImages = product.images.filter((img) => Boolean(img?.url));
  const images = validImages.length > 0 ? validImages : product.image ? [{ url: product.image, alt: product.alt }] : [];

  const [activeImage, setActiveImage] = useState(0);
  const currentImg = images[activeImage];
  const [imgError, setImgError] = useState(false);

  // Pre-select the first variant that can actually be bought — one less
  // decision between the shopper and the cart. They can still change it.
  const [variantId, setVariantId] = useState<number | null>(
    () => product.variants.find((v) => v.stockQty > 0)?.id ?? null,
  );
  const variant = useMemo(() => product.variants.find((v) => v.id === variantId) ?? null, [product.variants, variantId]);

  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = product.hasVariants ? (variant?.stockQty ?? 0) : product.stockQty;
  const soldOutEverywhere = product.stockQty <= 0;
  const price = variant?.price ?? product.price;
  const compareAt = variant ? variant.compareAtPrice : product.compareAtPrice;
  const showFrom = product.hasVariants && product.priceFrom && !variant;

  const optionLabel =
    product.variantAxis === "size" ? dict.optionSize : product.variantAxis === "color" ? dict.optionColor : dict.optionVolume;

  function selectVariant(id: number) {
    setVariantId(id);
    setError(null);
    const next = product.variants.find((v) => v.id === id);
    if (next) setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, next.stockQty)));
  }

  function handleAddToCart() {
    setError(null);
    if (product.hasVariants && !variant) {
      setError(dict.chooseOption);
      return;
    }
    startTransition(async () => {
      const res = await addToCartAction(product.id, quantity, variant?.id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      notifyAddedToCart({
        name: product.name,
        image: product.image,
        meta: [variant?.label, price].filter(Boolean).join(" · "),
      });
    });
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-14">
      {/* Gallery */}
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface-container">
          {!imgError && currentImg && Boolean(currentImg.url) ? (
            <Image
              key={currentImg.url}
              src={currentImg.url}
              alt={currentImg.alt || ""}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="animate-[fadeIn_400ms_ease-out] object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <VMark size={72} className="text-beige" />
            </div>
          )}
          {product.badge && (
            <span className="absolute start-4 top-4 rounded-full bg-charcoal px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ivory">
              {product.badge}
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-4 flex gap-3">
            {images.map((img, i) =>
              img.url ? (
                <button
                  key={img.url + i}
                  type="button"
                  onClick={() => {
                    setActiveImage(i);
                    setImgError(false);
                  }}
                  aria-label={`${img.alt || product.name} ${i + 1}`}
                  className={`h-20 w-16 overflow-hidden rounded-xl border transition-all duration-300 ${
                    i === activeImage ? "border-charcoal opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image src={img.url} alt="" width={64} height={80} className="h-full w-full object-cover" />
                </button>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="md:pt-4">
        {product.brand && (
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-gold-ink">{product.brand}</p>
        )}
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-charcoal md:text-4xl">
          {product.name}
        </h1>

        <div className="mt-4 flex items-baseline gap-3" aria-live="polite">
          {showFrom && <span className="text-sm text-on-surface-variant">{dict.from}</span>}
          <span className="text-2xl font-medium text-charcoal">{price}</span>
          {compareAt && <span className="text-base text-on-surface-variant line-through">{compareAt}</span>}
        </div>

        {product.description && <p className="mt-6 leading-relaxed text-charcoal/75">{product.description}</p>}
        {product.notes && <p className="mt-3 text-sm italic leading-relaxed text-on-surface-variant">{product.notes}</p>}

        {product.hasVariants && (
          <fieldset className="mt-8">
            <legend className="mb-3 flex w-full items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-charcoal">
              <span>
                {optionLabel}
                {variant && <span className="ms-2 normal-case tracking-normal text-on-surface-variant">— {variant.label}</span>}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const selected = v.id === variantId;
                const soldOut = v.stockQty <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={soldOut}
                    aria-pressed={selected}
                    onClick={() => selectVariant(v.id)}
                    className={`relative min-w-16 rounded-full border px-5 py-2.5 text-sm transition-all duration-300 active:scale-95 ${
                      selected
                        ? "border-charcoal bg-charcoal text-ivory"
                        : soldOut
                          ? "cursor-not-allowed border-beige text-on-surface-variant/50 line-through"
                          : "border-outline-variant bg-surface-container-lowest text-charcoal hover:border-charcoal"
                    }`}
                  >
                    {v.label}
                    {soldOut && <span className="sr-only"> — {dict.soldOut}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {soldOutEverywhere ? (
          <p className="mt-8 text-sm font-medium text-error">{dict.outOfStock}</p>
        ) : (
          <>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-1.5 py-1">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-surface-container"
                >
                  <Minus size={14} />
                </button>
                <span className="w-7 text-center text-sm font-medium tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), q + 1))}
                  disabled={quantity >= stock}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-surface-container disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={pending || (product.hasVariants && stock <= 0)}
                className={`group flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-xs font-medium uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 ${
                  added ? "bg-gold text-charcoal" : "bg-charcoal text-ivory hover:bg-primary-container"
                }`}
              >
                {added ? (
                  <Check size={16} className="animate-[popIn_300ms_ease-out]" />
                ) : (
                  <ShoppingBag size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                )}
                {added ? dict.added : dict.addToCart}
              </button>
            </div>
            {stock > 0 && stock <= LOW_STOCK_THRESHOLD && (
              <p className="mt-3 text-xs text-gold-ink">{dict.onlyLeft.replace("{n}", String(stock))}</p>
            )}
          </>
        )}
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}
