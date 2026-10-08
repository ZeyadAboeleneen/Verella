"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
  ZoomIn,
} from "lucide-react";
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

/** Expandable row (description / how to use / delivery). */
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  return (
    <div className="border-b border-[rgba(20,20,20,0.1)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-start text-xs font-medium uppercase tracking-[0.2em] text-charcoal"
      >
        {title}
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} className="text-on-surface-variant">
          <Plus size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-sm leading-relaxed text-[rgba(20,20,20,0.75)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  // Which way the photo should slide: compare against the last index shown.
  const [prevIndex, setPrevIndex] = useState(index);
  const [direction, setDirection] = useState(1);
  if (prevIndex !== index) {
    setDirection(index > prevIndex || (prevIndex === count - 1 && index === 0) ? 1 : -1);
    setPrevIndex(index);
  }
  const go = (step: number) => onIndexChange((index + step + count) % count);

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

  // Solid dark circles (plain rgba, never Tailwind's /opacity colours — those
  // compile to oklab(), whose alpha some Safari versions render as fully
  // transparent). A faint light tint would vanish against light product photos.
  const circle = { backgroundColor: "rgba(20, 20, 20, 0.72)" };
  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 80, scale: 0.96 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -80, scale: 0.96 }),
  };

  return (
    <motion.div
      // overflow-clip, not overflow-hidden: a hidden-overflow box is still
      // scrollable by focus(), which shifted the whole overlay sideways.
      className="fixed inset-0 z-[100] flex flex-col overflow-clip"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
      transition={{ duration: 0.35 }}
      onClick={onClose}
    >
      {/* Backdrop: deep charcoal plus a soft blurred copy of the current photo
          glowing behind it, so the colour of the product bleeds into the room. */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(14, 14, 14, 0.96)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-clip">
      <AnimatePresence initial={false}>
        {current?.url && !reduce && (
          <motion.div
            key={`glow-${current.url}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Image src={current.url} alt="" fill sizes="30vw" className="scale-125 object-cover blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Top bar */}
      <motion.div
        className="relative z-10 flex items-center justify-between gap-4 px-4 pt-4 md:px-8 md:pt-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
        transition={{ duration: 0.4, delay: 0.15, ease: EASE_OUT }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 truncate text-sm font-medium text-ivory/90">{productName}</span>
        <div className="flex shrink-0 items-center gap-3">
          {count > 1 && (
            <span className="text-xs tabular-nums text-ivory/60" dir="ltr">
              <span className="text-ivory">{String(index + 1).padStart(2, "0")}</span> / {String(count).padStart(2, "0")}
            </span>
          )}
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={circle}
            whileHover={reduce ? undefined : { rotate: 90 }}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ivory ring-1 ring-white/10 backdrop-blur-sm"
          >
            <X size={20} />
          </motion.button>
        </div>
      </motion.div>

      {/* Stage */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 py-4 md:px-24">
        <motion.div
          className="relative h-full w-full max-w-3xl"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
          transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 220, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {current?.url && (
              <motion.div
                key={current.url}
                custom={direction}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: EASE_OUT }}
                className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
                // Swipe between photos — the main way to browse on a phone;
                // the arrows are the fallback for mouse and keyboard.
                drag={count > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -8000 || offset.x < -80) go(1);
                  else if (swipe > 8000 || offset.x > 80) go(-1);
                }}
              >
                <Image
                  src={current.url}
                  alt={current.alt || productName}
                  fill
                  sizes="90vw"
                  draggable={false}
                  className="pointer-events-none object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {count > 1 &&
          ([
            { step: -1, label: "Previous", pos: "start-3 md:start-8", Icon: ChevronLeft, from: -20 },
            { step: 1, label: "Next", pos: "end-3 md:end-8", Icon: ChevronRight, from: 20 },
          ] as const).map(({ step, label, pos, Icon, from }) => (
            <motion.button
              key={label}
              type="button"
              aria-label={label}
              style={circle}
              onClick={(e) => {
                e.stopPropagation();
                go(step);
              }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: from }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              whileHover={reduce ? undefined : { scale: 1.08 }}
              whileTap={reduce ? undefined : { scale: 0.92 }}
              transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
              className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ivory ring-1 ring-white/10 backdrop-blur-sm md:h-12 md:w-12 ${pos}`}
            >
              <Icon size={20} className="rtl:rotate-180" />
            </motion.button>
          ))}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <motion.div
          className="relative z-10 flex justify-center gap-2 px-4 pb-6 pt-2 md:pb-8"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.45, delay: 0.2, ease: EASE_OUT }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`${productName} ${i + 1}`}
              className={`relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-white transition-all duration-300 md:h-16 md:w-14 ${
                i === index ? "opacity-100" : "opacity-40 hover:opacity-80"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-contain" />
              {i === index && (
                <motion.span
                  layoutId="lightbox-thumb-ring"
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-champagne"
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                />
              )}
            </button>
          ))}
        </motion.div>
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
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
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
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || imgError) return;
          const r = e.currentTarget.getBoundingClientRect();
          setLens({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setLens(null)}
        aria-label={dict.zoomImage}
        data-product-photo
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
              {/* Hover zoom (mouse only): magnifies 2× around the cursor. */}
              <div
                className="absolute inset-0 transition-transform duration-200 ease-out"
                style={{
                  transform: lens ? "scale(2)" : "scale(1)",
                  transformOrigin: lens ? `${lens.x}% ${lens.y}%` : "50% 50%",
                }}
              >
                <Image
                  src={current.url}
                  alt={current.alt || ""}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority
                  className="object-contain"
                  onError={() => setImgError(true)}
                />
              </div>
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

/** A product photo that flies from the gallery into the cart icon. */
function flyToCart(imageUrl: string | null | undefined) {
  if (!imageUrl || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = document.querySelector("[data-product-photo]")?.getBoundingClientRect();
  const cart = [...document.querySelectorAll<HTMLAnchorElement>('nav a[href$="/cart"]')].find((a) => a.offsetParent !== null);
  const to = cart?.getBoundingClientRect();
  if (!from || !to) return;

  const size = Math.min(from.width, from.height) * 0.55;
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = "";
  Object.assign(img.style, {
    position: "fixed",
    zIndex: "200",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    pointerEvents: "none",
    borderRadius: "16px",
    background: "#fff",
    boxShadow: "0 20px 40px rgba(20,20,20,0.25)",
  });
  document.body.appendChild(img);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = img.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 60}px) scale(0.55)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.4 },
    ],
    { duration: 850, easing: "cubic-bezier(0.55, 0, 0.35, 1)" },
  );
  anim.onfinish = () => {
    img.remove();
    cart?.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 400, easing: "ease-out" });
  };
}

export function ProductDetail({ product, dict }: { product: StoreProductDetailView; dict: Dictionary["product"] }) {
  const reduce = useReducedMotion();
  const router = useRouter();
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
  const [buying, startBuying] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (addTimeoutRef.current) clearTimeout(addTimeoutRef.current); }, []);

  const buyRef = useRef<HTMLDivElement>(null);
  // Phones: the buy bar is fixed to the bottom, so reserve its height at the
  // end of the page (the footer would otherwise sit underneath it).
  useEffect(() => {
    if (product.stockQty <= 0) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => (document.body.style.paddingBottom = mq.matches ? "calc(env(safe-area-inset-bottom) + 150px)" : "");
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.paddingBottom = "";
    };
  }, [product.stockQty]);

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

  function canAdd() {
    setError(null);
    if (product.hasVariants && !variant) {
      setError(dict.chooseOption);
      buyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  function handleAddToCart() {
    if (!canAdd()) return;
    startTransition(async () => {
      const res = await addToCartAction(product.id, quantity, variant?.id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      flyToCart(images[0]?.url ?? product.image);
      setAdded(true);
      addTimeoutRef.current = setTimeout(() => setAdded(false), 1600);
      notifyAddedToCart({
        name: product.name,
        image: product.image,
        meta: [variant?.label, price].filter(Boolean).join(" · "),
        compareAt,
      });
    });
  }

  /** Add, then go straight to checkout — no "added" dialog in between. */
  function handleBuyNow() {
    if (!canAdd()) return;
    startBuying(async () => {
      const res = await addToCartAction(product.id, quantity, variant?.id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push("/checkout");
    });
  }

  const trust = [
    { Icon: ShieldCheck, label: dict.trustOriginal },
    { Icon: Truck, label: dict.trustDelivery },
    { Icon: Banknote, label: dict.trustCod },
  ];
  const isFragrance = Boolean(product.notes);

  return (
    <>
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <Gallery images={images} badge={product.badge} productName={product.name} dict={dict} />
        </motion.div>

        {/* Info */}
        <div>
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
            {product.offer && !soldOutEverywhere && (
              <span className="mt-3 inline-flex items-center rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold tracking-[0.03em] text-champagne">
                {product.offer}
              </span>
            )}
          </Reveal>

          {product.notes && (
            <Reveal y={12} delay={0.15}>
              <NotePyramid notes={product.notes} dict={dict} />
            </Reveal>
          )}

          {product.hasVariants && (
            <Reveal y={12} delay={0.2}>
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
                              ? "cursor-not-allowed border-beige text-on-surface-variant line-through opacity-50"
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
            <Reveal y={12} delay={0.25}>
              <p className="mt-8 text-sm font-medium text-error">{dict.outOfStock}</p>
            </Reveal>
          ) : (
            <Reveal y={12} delay={0.25}>
              <div ref={buyRef} className="mt-8 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-1.5 py-1 md:flex">
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
                    disabled={pending || buying || (product.hasVariants && stock <= 0)}
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                    className={`group hidden h-12 flex-1 items-center justify-center gap-2 rounded-full text-xs md:flex font-medium uppercase tracking-[0.2em] transition-colors duration-300 disabled:opacity-50 ${
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
                          {pending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5" />}
                          {dict.addToCart}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
                <motion.button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={pending || buying || (product.hasVariants && stock <= 0)}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="hidden h-12 w-full items-center justify-center gap-2 rounded-full border border-charcoal text-xs font-medium uppercase tracking-[0.2em] text-charcoal transition-colors duration-300 hover:bg-charcoal hover:text-ivory disabled:opacity-50 md:flex"
                >
                  {buying && <Loader2 size={16} className="animate-spin" />}
                  {dict.buyNow}
                </motion.button>
              </div>
              {stock > 0 && stock <= LOW_STOCK_THRESHOLD && (
                <p className="mt-3 text-xs text-gold-ink">{dict.onlyLeft.replace("{n}", String(stock))}</p>
              )}
            </Reveal>
          )}
          {error && <p className="mt-3 text-sm text-error">{error}</p>}

          {/* Trust row */}
          <Reveal y={12} delay={0.3}>
            <ul className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-surface-container-low p-3">
              {trust.map(({ Icon, label }) => (
                <li key={label} className="flex flex-col items-center gap-1.5 px-1 py-1 text-center">
                  <Icon size={18} strokeWidth={1.6} className="text-gold-ink" aria-hidden="true" />
                  <span className="text-[11px] leading-snug text-charcoal">{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Details */}
          <Reveal y={12} delay={0.35}>
            <div className="mt-6 border-t border-[rgba(20,20,20,0.1)]">
              {product.description && (
                <Section title={dict.sectionDescription} defaultOpen>
                  <p>{product.description}</p>
                </Section>
              )}
              {isFragrance && (
                <Section title={dict.sectionHowToUse}>
                  <p>{dict.howToUseText}</p>
                </Section>
              )}
              <Section title={dict.sectionDelivery}>
                <p>{dict.deliveryText}</p>
              </Section>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Phones: a floating buy card fixed to the bottom of the screen. */}
      {!soldOutEverywhere && (
        <motion.div
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 md:hidden"
          initial={reduce ? false : { y: "130%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: EASE_OUT }}
        >
          <div
            className="rounded-[22px] p-2.5 backdrop-blur-xl"
            style={{
              background: "rgba(250,247,242,0.94)",
              boxShadow: "0 18px 40px -12px rgba(20,20,20,0.35), 0 0 0 1px rgba(20,20,20,0.06)",
            }}
          >
            {/* Product · price · size · quantity */}
            <div className="flex items-center gap-3 px-1 pb-2.5">
              {images[0]?.url && (
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-[rgba(20,20,20,0.06)]">
                  <Image src={images[0].url} alt="" fill sizes="44px" className="object-contain p-0.5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight text-charcoal">{product.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-charcoal">{price}</span>
                  {compareAt && <span className="text-[11px] text-on-surface-variant line-through">{compareAt}</span>}
                  {product.hasVariants && (
                    <span className="truncate rounded-full bg-champagne px-2 py-px text-[10px] font-semibold text-charcoal">
                      {variant ? variant.label : dict.chooseOption}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center rounded-full bg-white p-0.5 ring-1 ring-[rgba(20,20,20,0.08)]">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal transition-colors active:bg-surface-container disabled:opacity-30"
                >
                  <Minus size={13} />
                </button>
                <motion.span
                  key={quantity}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-6 text-center text-sm font-semibold tabular-nums text-charcoal"
                >
                  {quantity}
                </motion.span>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), q + 1))}
                  disabled={quantity >= stock}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal transition-colors active:bg-surface-container disabled:opacity-30"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={handleAddToCart}
                disabled={pending || buying || (product.hasVariants && stock <= 0)}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className={`flex h-12 flex-[1.35] items-center justify-center gap-2 rounded-2xl text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                  added ? "bg-gold text-charcoal" : "bg-charcoal text-ivory"
                }`}
              >
                {added ? <Check size={16} /> : pending ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                {added ? dict.added : dict.addToCart}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleBuyNow}
                disabled={pending || buying || (product.hasVariants && stock <= 0)}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-[12px] font-semibold text-charcoal ring-1 ring-[rgba(20,20,20,0.15)] disabled:opacity-50"
              >
                {buying && <Loader2 size={15} className="animate-spin" />}
                {dict.buyNow}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
