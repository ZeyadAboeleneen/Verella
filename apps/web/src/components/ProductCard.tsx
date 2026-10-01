"use client";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, X } from "lucide-react";
import { addToCartAction } from "@/lib/cart/actions";
import { notifyAddedToCart } from "@/lib/cart/added-to-cart-bus";
import type { StoreProductView } from "@/lib/store/queries";
import type { Dictionary } from "@/lib/i18n";
import { VMark } from "@/components/brand/Logo";

function percentOff(price: string, compareAt: string | null): number | null {
  if (!compareAt) return null;
  const n = (s: string) => Number(s.replace(/[^\d.]/g, ""));
  const p = n(price);
  const c = n(compareAt);
  return c > p && p > 0 ? Math.round((1 - p / c) * 100) : null;
}

export default function ProductCard({
  product,
  labels,
  soldOutLabel,
}: {
  product: StoreProductView;
  labels: Dictionary["product"];
  soldOutLabel?: string;
}) {
  const { id, slug, name, brand, price, compareAtPrice, priceFrom, badge, image, hoverImage, alt, hasVariants, variants, stockQty } = product;
  const [imgError, setImgError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  // Touch screens have no hover, so the quick-add tray opens on tap instead.
  const [trayOpen, setTrayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soldOut = stockQty <= 0;
  const off = percentOff(price, compareAtPrice);
  const href = `/store/${slug}`;

  function add(variantId?: number) {
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(id, 1, variantId);
      if ("error" in res) {
        setError(res.error);
        setTimeout(() => setError(null), 3000);
        return;
      }
      const variant = variants.find((v) => v.id === variantId);
      setTrayOpen(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      notifyAddedToCart({ name, image, meta: [variant?.label, variant?.price ?? price].filter(Boolean).join(" · ") });
    });
  }

  return (
    <article className="group/card flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-container">
        <Link href={href} aria-label={name} className="absolute inset-0 block">
          {!imgError && image ? (
            <>
              <Image
                src={image}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className={`object-cover transition-all duration-700 ease-out ${
                  hoverImage ? "group-hover/card:scale-[1.04] group-hover/card:opacity-0" : "group-hover/card:scale-[1.06]"
                } ${soldOut ? "grayscale opacity-60" : ""}`}
                onError={() => setImgError(true)}
              />
              {hoverImage && (
                <Image
                  src={hoverImage}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="scale-105 bg-white object-contain p-2 opacity-0 transition-all duration-700 ease-out group-hover/card:scale-100 group-hover/card:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <VMark size={44} className="text-beige transition-transform duration-700 group-hover/card:scale-110" />
            </span>
          )}
        </Link>

        <div className="pointer-events-none absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut && (
            <span className="rounded-full bg-ivory px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-charcoal">
              {soldOutLabel ?? labels.soldOut}
            </span>
          )}
          {!soldOut && off && (
            <span className="rounded-full bg-champagne px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-charcoal">
              −{off}%
            </span>
          )}
          {!soldOut && badge && (
            <span className="rounded-full bg-plum px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-ivory">
              {badge}
            </span>
          )}
        </div>

        {/* Quick add: slides up on hover (desktop) or opens from the + (touch). */}
        {!soldOut && (
          <>
            <button
              type="button"
              onClick={() => (hasVariants ? setTrayOpen((v) => !v) : add())}
              disabled={pending}
              aria-label={hasVariants ? labels.chooseSize : labels.addToCart}
              aria-expanded={hasVariants ? trayOpen : undefined}
              style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}
              className={`absolute bottom-3 end-3 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 active:scale-90 [@media(hover:hover)]:hidden ${
                added ? "bg-gold text-charcoal" : trayOpen ? "bg-plum text-ivory" : "bg-ivory text-charcoal"
              }`}
            >
              <span className={`transition-transform duration-300 ${trayOpen ? "rotate-90" : ""}`}>
                {added ? <Check size={16} /> : trayOpen ? <X size={16} /> : <Plus size={16} />}
              </span>
            </button>

            {/* On touch the tray pops up centred on the image, clear of the +; on hover devices it sits at the bottom. */}
            <div
              style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 10px 30px rgba(0,0,0,0.16)" }}
              className={`absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-2xl p-2.5 backdrop-blur-md transition-all duration-300 ease-out [@media(hover:hover)]:top-auto [@media(hover:hover)]:bottom-2 [@media(hover:hover)]:translate-y-0 [@media(hover:hover)]:group-hover/card:pointer-events-auto [@media(hover:hover)]:group-hover/card:scale-100 [@media(hover:hover)]:group-hover/card:opacity-100 ${
                trayOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
              }`}
            >
              {hasVariants ? (
                <>
                  <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                    {labels.chooseSize}
                  </p>
                  <div className={`grid gap-1.5 ${variants.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {variants.map((v) => {
                      const out = v.stockQty <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={out || pending}
                          onClick={() => add(v.id)}
                          className={`flex flex-col items-center justify-center rounded-xl border px-2 py-1.5 transition-all duration-200 active:scale-95 ${
                            out
                              ? "cursor-not-allowed border-transparent opacity-40"
                              : "border-[rgba(40,30,35,0.15)] text-charcoal hover:border-plum hover:bg-plum hover:text-ivory"
                          }`}
                        >
                          <span className={`text-[11px] font-semibold uppercase ${out ? "line-through" : ""}`}>{v.label}</span>
                          {v.price && <span className="text-[10px] opacity-70">{v.price}</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => add()}
                  disabled={pending}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-full bg-plum text-[11px] font-medium uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-plum-deep"
                >
                  {added ? <Check size={14} /> : <Plus size={14} />}
                  {added ? labels.added : labels.addToCart}
                </button>
              )}
            </div>
          </>
        )}

        <AnimatePresence>
          {added && (
            <motion.span
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-charcoal/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-ivory text-charcoal"
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
              >
                <Check size={22} />
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <Link href={href} className="mt-3 block">
        {brand && <p className="mb-1 truncate text-[10px] font-medium uppercase tracking-[0.2em] text-gold-ink">{brand}</p>}
        <h3 className="line-clamp-1 text-sm uppercase tracking-wide text-charcoal">{name}</h3>
        <p className="mt-1 flex items-baseline gap-1.5 text-sm">
          {priceFrom && <span className="text-[11px] text-on-surface-variant">{labels.from}</span>}
          <span className={soldOut ? "text-on-surface-variant" : "text-charcoal"}>{price}</span>
          {compareAtPrice && <span className="text-xs text-on-surface-variant line-through">{compareAtPrice}</span>}
        </p>
      </Link>
      {error && (
        <p role="alert" className="mt-1 text-[11px] leading-snug text-error">
          {error}
        </p>
      )}
    </article>
  );
}
