"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, X, ZoomIn } from "lucide-react";
import { addToCartAction } from "@/lib/cart/actions";
import { notifyAddedToCart } from "@/lib/cart/added-to-cart-bus";
import type { StoreProductDetailView } from "@/lib/store/queries";
import type { Dictionary } from "@/lib/i18n";
import { VMark } from "@/components/brand/Logo";
import { EASE_OUT, Reveal } from "@/components/motion/Reveal";

const LOW_STOCK_THRESHOLD = 5;
/** How long each gallery photo holds before auto-advancing to the next. */
const AUTOPLAY_MS = 4500;

/** "top | heart | base" → labelled tiers; a single tier is shown as plain notes. */
function NotePyramid({ notes, dict }: { notes: string; dict: Dictionary["product"] }) {
  const tiers = notes.split("|").map((t) => t.trim()).filter(Boolean);
  const labels = tiers.length === 3 ? [dict.notesTop, dict.notesHeart, dict.notesBase] : [dict.notes];
  return (
    <dl className="mt-6 grid gap-3 rounded-2xl bg-surface-container-low p-5 text-sm">
      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-[92px_1fr] gap-3">
          <dt className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-ink">{labels[i] ?? dict.notes}</dt>
          <dd className="leading-relaxed text-charcoal/80">{tier}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Fullscreen lightbox — opened by clicking the main photo. Its own prev/next nav, closes on backdrop click, the ✕ button, or Escape. */
function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  productName,
}: {
  images: { url: string; alt: string | null }[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  productName: string;
  dict: Dictionary["product"];
}) {
  const reduce = useReducedMotion();
  const count = images.length;
  const current = images[index];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, count, onClose, onIndexChange]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4 md:p-10"
      // Plain rgba instead of Tailwind's bg-charcoal/95 (an oklab() colour under
      // the hood) — some Safari versions render oklab()'s alpha channel as fully
      // transparent, leaving the backdrop invisible while the rest of the modal
      // (close button, arrows) still shows up fine.
      style={{ backgroundColor: "rgba(20, 20, 20, 0.95)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
    >
      {/* Solid dark circles (plain rgba — see the backdrop comment above) rather
          than a faint tint: against a light product photo, a near-transparent
          light-on-light button all but disappears. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{ backgroundColor: "rgba(20, 20, 20, 0.7)" }}
        className="absolute end-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-ivory backdrop-blur-sm transition-colors hover:bg-black/80"
      >
        <X size={20} />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + count) % count);
            }}
            aria-label="Previous"
            style={{ backgroundColor: "rgba(20, 20, 20, 0.7)" }}
            className="absolute start-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ivory backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <ChevronLeft size={20} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % count);
            }}
            aria-label="Next"
            style={{ backgroundColor: "rgba(20, 20, 20, 0.7)" }}
            className="absolute end-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ivory backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <ChevronRight size={20} className="rtl:rotate-180" />
          </button>
        </>
      )}

      <motion.div
        className="relative w-full min-h-0 max-w-3xl flex-1"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait" initial={false}>
          {current?.url && (
            <motion.div
              key={current.url}
              className="absolute inset-0 touch-pan-y"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              // Swipe to move between photos — the main way to browse the
              // lightbox on a phone; the arrow buttons are the fallback for
              // mouse/keyboard. touch-pan-y above keeps vertical page scroll
              // (blocked elsewhere by the body scroll-lock, but harmless to
              // keep) from fighting the horizontal drag gesture.
              drag={count > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x;
                if (swipe < -8000 || offset.x < -80) {
                  onIndexChange((index + 1) % count);
                } else if (swipe > 8000 || offset.x > 80) {
                  onIndexChange((index - 1 + count) % count);
                }
              }}
            >
              <Image
                src={current.url}
                alt={current.alt || productName}
                fill
                sizes="90vw"
                draggable={false}
                className="pointer-events-none object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {count > 1 && (
        <span className="shrink-0 text-xs tabular-nums tracking-[0.2em] text-ivory/70" dir="ltr">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
      )}
    </motion.div>
  );
}

/**
 * Gallery: crossfades between photos, auto-advances every AUTOPLAY_MS while
 * there's more than one image, and pauses on hover/focus so a shopper who's
 * actually looking at a photo doesn't have it yanked away mid-look. Clicking
 * the main photo opens it full-screen.
 */
function Gallery({
  images,
  badge,
  productName,
  dict,
}: {
  images: { url: string; alt: string | null }[];
  badge?: string;
  productName: string;
  dict: Dictionary["product"];
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  // Portalling to <body> needs the DOM to exist, so it only kicks in after mount.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after hydration
  useEffect(() => setMounted(true), []);
  const count = images.length;
  const current = images[active];

  useEffect(() => {
    if (reduce || paused || zoomOpen || count < 2) return;
    const t = setTimeout(() => {
      setDirection(1);
      setActive((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [active, paused, zoomOpen, reduce, count]);

  function select(i: number) {
    setDirection(i > active ? 1 : -1);
    setActive(i);
    setImgError(false);
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button
        type="button"
        onClick={() => current?.url && !imgError && setZoomOpen(true)}
        aria-label={dict.zoomImage}
        className="group relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-3xl bg-white"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {!imgError && current && Boolean(current.url) ? (
            <motion.div
              key={current.url}
              custom={direction}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 24, scale: 1.02 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
            >
              <Image
                src={current.url}
                alt={current.alt || ""}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
                className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                onError={() => setImgError(true)}
              />
            </motion.div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <VMark size={72} className="text-beige" />
            </div>
          )}
        </AnimatePresence>

        {badge && (
          <span className="absolute start-4 top-4 z-10 rounded-full bg-plum px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-ivory">
            {badge}
          </span>
        )}

        {/* Autoplay progress — one segment per photo, the active one fills over AUTOPLAY_MS. */}
        {count > 1 && (
          <div className="absolute inset-x-4 top-4 z-10 flex gap-1.5" dir="ltr">
            {images.map((img, i) => (
              <span key={img.url + i} className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-charcoal/15">
                {i < active && <span className="absolute inset-0 bg-charcoal/50" />}
                {i === active && !reduce && (
                  <motion.span
                    key={`${img.url}-${paused}-${zoomOpen}`}
                    className="absolute inset-0 origin-left bg-charcoal/60"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: paused || zoomOpen ? 0.02 : 1 }}
                    transition={{ duration: paused || zoomOpen ? 0.3 : AUTOPLAY_MS / 1000, ease: "linear" }}
                  />
                )}
              </span>
            ))}
          </div>
        )}

        {!imgError && current?.url && (
          <span className="absolute bottom-4 end-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/70 text-ivory opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
            <ZoomIn size={16} />
          </span>
        )}
      </button>

      {count > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((img, i) =>
            img.url ? (
              <button
                key={img.url + i}
                type="button"
                onClick={() => select(i)}
                aria-label={`${img.alt || productName} ${i + 1}`}
                aria-current={i === active}
                className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl"
              >
                <Image src={img.url} alt="" width={64} height={80} className="h-full w-full bg-white object-contain" />
                <span
                  className={`pointer-events-none absolute inset-0 rounded-xl border transition-all duration-300 ${
                    i === active ? "border-charcoal" : "border-transparent bg-charcoal/0 opacity-60 hover:opacity-100 hover:border-outline-variant"
                  }`}
                />
                {i === active && !reduce && (
                  <motion.span
                    layoutId="gallery-thumb-ring"
                    className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-charcoal"
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                  />
                )}
              </button>
            ) : null,
          )}
        </div>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {zoomOpen && (
              <Lightbox
                images={images}
                index={active}
                onIndexChange={(i) => {
                  setDirection(i > active ? 1 : -1);
                  setActive(i);
                }}
                onClose={() => setZoomOpen(false)}
                productName={productName}
                dict={dict}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export function ProductDetail({ product, dict }: { product: StoreProductDetailView; dict: Dictionary["product"] }) {
  const reduce = useReducedMotion();
  const validImages = product.images.filter((img) => Boolean(img?.url));
  const images = validImages.length > 0 ? validImages : product.image ? [{ url: product.image, alt: product.alt }] : [];

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
  const addTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (addTimeoutRef.current) clearTimeout(addTimeoutRef.current); }, []);

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
      addTimeoutRef.current = setTimeout(() => setAdded(false), 1600);
      notifyAddedToCart({
        name: product.name,
        image: product.image,
        meta: [variant?.label, price].filter(Boolean).join(" · "),
      });
    });
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-14">
      <Reveal y={16}>
        <Gallery images={images} badge={product.badge} productName={product.name} dict={dict} />
      </Reveal>

      {/* Info */}
      <div className="md:pt-4">
        {product.brand && (
          <Reveal y={12}>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-gold-ink">{product.brand}</p>
          </Reveal>
        )}
        <Reveal y={16} delay={0.05}>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-charcoal md:text-4xl">
            {product.name}
          </h1>
        </Reveal>

        <Reveal y={12} delay={0.1}>
          <div className="mt-4 flex items-baseline gap-3" aria-live="polite">
            {showFrom && <span className="text-sm text-on-surface-variant">{dict.from}</span>}
            <span className="text-2xl font-medium text-charcoal">{price}</span>
            {compareAt && <span className="text-base text-on-surface-variant line-through">{compareAt}</span>}
          </div>
        </Reveal>

        {product.description && (
          <Reveal y={12} delay={0.15}>
            <p className="mt-6 leading-relaxed text-charcoal/75">{product.description}</p>
          </Reveal>
        )}
        {product.notes && (
          <Reveal y={12} delay={0.2}>
            <NotePyramid notes={product.notes} dict={dict} />
          </Reveal>
        )}

        {product.hasVariants && (
          <Reveal y={12} delay={0.25}>
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
                    <motion.button
                      key={v.id}
                      type="button"
                      disabled={soldOut}
                      aria-pressed={selected}
                      onClick={() => selectVariant(v.id)}
                      whileTap={reduce || soldOut ? undefined : { scale: 0.95 }}
                      className={`relative min-w-16 rounded-full border px-5 py-2.5 text-sm transition-colors duration-300 ${
                        selected
                          ? "border-plum bg-plum text-ivory"
                          : soldOut
                            ? "cursor-not-allowed border-beige text-on-surface-variant/50 line-through"
                            : "border-outline-variant bg-surface-container-lowest text-charcoal hover:border-charcoal"
                      }`}
                    >
                      {v.label}
                      {soldOut && <span className="sr-only"> — {dict.soldOut}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </fieldset>
          </Reveal>
        )}

        {soldOutEverywhere ? (
          <Reveal y={12} delay={0.3}>
            <p className="mt-8 text-sm font-medium text-error">{dict.outOfStock}</p>
          </Reveal>
        ) : (
          <Reveal y={12} delay={0.3}>
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
              <motion.button
                type="button"
                onClick={handleAddToCart}
                disabled={pending || (product.hasVariants && stock <= 0)}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className={`group flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-xs font-medium uppercase tracking-[0.2em] transition-colors duration-300 disabled:opacity-50 ${
                  added ? "bg-gold text-charcoal" : "bg-plum text-ivory hover:bg-plum-deep"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span
                      key="added"
                      initial={reduce ? undefined : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduce ? undefined : { scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="flex items-center gap-2"
                    >
                      <Check size={16} />
                      {dict.added}
                    </motion.span>
                  ) : (
                    <motion.span key="add" className="flex items-center gap-2">
                      <ShoppingBag size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
                      {dict.addToCart}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            {stock > 0 && stock <= LOW_STOCK_THRESHOLD && (
              <p className="mt-3 text-xs text-gold-ink">{dict.onlyLeft.replace("{n}", String(stock))}</p>
            )}
          </Reveal>
        )}
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}
