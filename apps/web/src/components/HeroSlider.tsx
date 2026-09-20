"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { HeroSlideView } from "@/lib/content/queries";
import { addToCartAction } from "@/lib/cart/actions";
import { notifyAddedToCart } from "@/lib/cart/added-to-cart-bus";

export interface HeroCopy {
  kicker: string;
  title: string;
  subtitle: string;
  shopCoffee: string;
  ourStory: string;
}

export interface HeroCartProduct {
  name: string;
  image: string;
  price: string;
}

const SLIDE_INTERVAL_MS = 6000;

/** Admin encodes "add this product to the cart" as the string "cart:<id>" in a link field — see LinkPicker's cartActionValue(). */
function parseCartProductId(href: string | null | undefined): number | null {
  const match = href?.match(/^cart:(\d+)$/);
  return match ? Number(match[1]) : null;
}

/**
 * Renders a slide's link destination as either a normal navigable link, or —
 * when the admin picked "Add to cart" for that destination — a button that
 * adds the product to the cart in place, without leaving the homepage.
 */
function HeroAction({
  href,
  className,
  ariaLabel,
  tabIndex,
  products,
  children,
}: {
  href: string | null | undefined;
  className: string;
  ariaLabel?: string;
  tabIndex?: number;
  products: Record<number, HeroCartProduct>;
  children: React.ReactNode;
}) {
  const cartProductId = parseCartProductId(href);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  if (cartProductId != null) {
    const product = products[cartProductId];
    return (
      <button
        type="button"
        className={className}
        tabIndex={tabIndex}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await addToCartAction(cartProductId, 1);
            if (!("error" in res)) {
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
              notifyAddedToCart(
                product ? { name: product.name, image: product.image, meta: product.price } : {},
              );
            }
          });
        }}
      >
        {added ? "Added ✓" : children}
      </button>
    );
  }

  if (!href) return null;

  return (
    <Link href={href} aria-label={ariaLabel} tabIndex={tabIndex} className={className}>
      {children}
    </Link>
  );
}

/**
 * Homepage hero. One slide renders as a static hero; multiple slides
 * cross-fade automatically with dot navigation. Slide text falls back to the
 * site dictionary copy when a slide has no override of its own.
 *
 * Mobile is composed bottom-up (content anchored to the lower edge over a
 * bottom scrim) — portrait screens read this as intentional art direction,
 * where the desktop's vertically-centred, side-lit layout felt unbalanced.
 */
export function HeroSlider({
  slides,
  copy,
  cartProducts = {},
}: {
  slides: HeroSlideView[];
  copy: HeroCopy;
  /** Product name/image/price, keyed by id — used only to show a nice "added to cart" toast for slides configured with an "Add to cart" destination. */
  cartProducts?: Record<number, HeroCartProduct>;
}) {
  const [active, setActive] = useState(0);
  const many = slides.length > 1;

  useEffect(() => {
    if (!many) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [many, slides.length]);

  const slide = slides[Math.min(active, slides.length - 1)];
  // A real admin slide (id !== 0 — 0 is the synthetic built-in fallback) with
  // no title, subtitle, or buttons of its own renders as a bare image: no
  // scrim, no text, no CTA — just the picture, as configured.
  const isBare = !!slide && slide.id !== 0 && !slide.title && !slide.subtitle && !slide.ctaText && !slide.ctaText2;

  return (
    <section className="relative flex min-h-[56svh] items-end overflow-hidden md:min-h-0 md:h-[600px] md:items-center">
      {/* Backgrounds — all rendered, cross-faded by opacity, with a slow
          Ken Burns drift on the active slide */}
      <div className="absolute inset-0 z-0">
        {slides.map((s, i) => {
          const bg = (
            <div
              className={`absolute inset-0 bg-cover bg-center transition-[opacity,transform] duration-1000 ease-in-out ${
                i === active ? "opacity-100 scale-[1.06] [transition-duration:1000ms,7000ms]" : "opacity-0 scale-100"
              }`}
              style={{ backgroundImage: `url('${s.imageUrl}')` }}
              aria-hidden={i !== active}
            />
          );
          // Every slide's background stays mounted (cross-fade relies on
          // opacity), so inactive ones must be non-interactive — otherwise
          // their invisible click targets stack on top of the active slide.
          return s.imageLinkUrl ? (
            <HeroAction
              key={s.id}
              href={s.imageLinkUrl}
              ariaLabel="View"
              className={`absolute inset-0 block w-full text-start ${i === active ? "" : "pointer-events-none"}`}
              tabIndex={i === active ? 0 : -1}
              products={cartProducts}
            >
              {bg}
            </HeroAction>
          ) : (
            <div key={s.id} className="absolute inset-0">
              {bg}
            </div>
          );
        })}
        {/* Mobile: bottom-up scrim under the content. Desktop: classic side light. */}
        {!isBare && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 md:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-black/70 via-black/40 to-transparent md:block rtl:md:bg-gradient-to-l" />
          </>
        )}
      </div>

      {!isBare && (
        <div className={`relative z-10 mx-auto w-full max-w-[1280px] px-5 pt-24 md:px-16 md:py-0 ${many ? "pb-14" : "pb-10"} md:pb-0`}>
          <div className="max-w-2xl space-y-4 text-white md:space-y-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FFE2C6] md:text-xs">
              {copy.kicker}
            </p>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[1.9rem] font-bold leading-[1.12] tracking-tight md:text-5xl md:leading-[1.1]">
              {slide?.title || copy.title}
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-[#FEE5C9] md:text-lg">
              {slide?.subtitle || copy.subtitle}
            </p>
            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row md:gap-4 md:pt-0">
              <HeroAction
                href={slide?.linkUrl || "/store"}
                products={cartProducts}
                className="flex h-12 items-center justify-center rounded-full bg-[#57392D] px-8 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-[#412B22] md:h-auto md:px-10 md:py-4"
              >
                {slide?.ctaText || copy.shopCoffee}
              </HeroAction>
              {/* Button 2: a real slide only gets one if it configured its own; the
                  synthetic default fallback slide always shows "Our Story". */}
              {slide?.id === 0 ? (
                <Link
                  href="/about"
                  className="flex h-12 items-center justify-center rounded-full border border-white/70 px-8 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-[2px] transition-all hover:bg-white hover:text-black md:h-auto md:border-white md:px-10 md:py-4"
                >
                  {copy.ourStory}
                </Link>
              ) : (
                slide?.ctaText2 && (
                  <HeroAction
                    href={slide.link2Url || "/store"}
                    products={cartProducts}
                    className="flex h-12 items-center justify-center rounded-full border border-white/70 px-8 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-[2px] transition-all hover:bg-white hover:text-black md:h-auto md:border-white md:px-10 md:py-4"
                  >
                    {slide.ctaText2}
                  </HeroAction>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dot navigation */}
      {many && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2.5 md:bottom-5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === active}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
