"use client";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AddedToCartDialog } from "@/components/AddedToCartDialog";
import { subscribeAddedToCart, type AddedToCartPayload } from "@/lib/cart/added-to-cart-bus";
import { stripLocalePrefix } from "@/lib/i18n/client";
import { AnimatedLockup } from "@/components/brand/AnimatedLockup";
import { VMark } from "@/components/brand/Logo";
import { EASE_OUT } from "@/components/motion/Reveal";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { StoreCategoryView } from "@/lib/store/queries";

interface NavUser {
  name?: string | null;
  email?: string | null;
  permissions: string[];
}

function CartBadge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-champagne px-1 text-[10px] font-medium text-charcoal"
          initial={{ scale: 0.3 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

const linkClass = "relative whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.25em] transition-opacity hover:opacity-60";

export default function Navbar({
  dict,
  locale,
  user,
  cartCount,
  categories = [],
}: {
  dict: Dictionary;
  locale: Locale;
  user: NavUser | null;
  cartCount: number;
  categories?: StoreCategoryView[];
}) {
  const pathname = stripLocalePrefix(usePathname());
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [preview, setPreview] = useState(0);
  const [addedToCart, setAddedToCart] = useState<AddedToCartPayload | null>(null);

  useEffect(() => subscribeAddedToCart(setAddedToCart), []);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setPastHero(y > window.innerHeight * 0.75);
      if (y < 120) setHidden(false);
      else if (y - lastY > 6) setHidden(true);
      else if (lastY - y > 6) setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close any open menu on navigation (adjusted during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setNavOpen(false);
    setShopOpen(false);
  }

  // Sticky elements further down dock against the header via this variable.
  const navRef = useRef<HTMLElement>(null);
  const navVisible = !hidden || navOpen || shopOpen || !!addedToCart;
  useEffect(() => {
    const height = navVisible ? (navRef.current?.offsetHeight ?? 72) : 0;
    document.documentElement.style.setProperty("--nav-offset", `${height}px`);
  }, [navVisible, scrolled]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  // Over the home hero the bar is transparent with ivory type; everywhere else (or once scrolled) it's solid.
  const overlay = isHome && !pastHero && !navOpen && !shopOpen;
  const tone = overlay ? "text-ivory" : "text-charcoal";
  const canAccessDashboard = !!user && user.permissions.length > 0;
  const links = [
    { href: "/store", label: dict.nav.store },
    { href: "/about", label: dict.nav.about },
  ];

  const addedToCartDialog = (
    <AddedToCartDialog
      open={!!addedToCart}
      onClose={() => setAddedToCart(null)}
      productName={addedToCart?.name}
      productImage={addedToCart?.image}
      productMeta={addedToCart?.meta}
      locale={locale}
      labels={{ title: dict.product.addedToCartTitle, continueShopping: dict.product.continueShopping, goToCart: dict.product.goToCart }}
    />
  );

  const cartButton = (
    <div className="relative">
      <Link href="/cart" aria-label={dict.nav.cart} className="relative flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60">
        <ShoppingBag size={19} strokeWidth={1.6} />
        <CartBadge count={cartCount} />
      </Link>
      {addedToCartDialog}
    </div>
  );

  return (
    <nav
      ref={navRef}
      className={`sticky inset-x-0 top-0 z-50 transition-[transform,background-color,border-color] duration-500 ease-out ${
        overlay ? "border-b border-transparent bg-transparent" : "border-b border-charcoal/10 bg-ivory/90 backdrop-blur-xl"
      } ${navVisible ? "translate-y-0" : "-translate-y-full"} ${tone}`}
      onMouseLeave={() => setShopOpen(false)}
    >
      <div className={`mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-4 transition-[padding] duration-500 md:px-10 ${scrolled ? "py-3" : "py-5"}`} dir="ltr">
        {/* Left */}
        <div className="flex items-center gap-7">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            className="-ms-2 flex h-10 w-10 items-center justify-center lg:hidden"
          >
            {navOpen ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
          </button>
          <div className="hidden items-center gap-8 lg:flex">
            <button
              type="button"
              className={`${linkClass} flex items-center gap-1.5`}
              onMouseEnter={() => setShopOpen(true)}
              onClick={() => setShopOpen((v) => !v)}
              aria-expanded={shopOpen}
            >
              {dict.nav.store}
              <ChevronDown size={12} className={`transition-transform duration-300 ${shopOpen ? "rotate-180" : ""}`} />
            </button>
            {links.slice(1).map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass} onMouseEnter={() => setShopOpen(false)}>
                {label}
                {pathname === href && <motion.span layoutId="nav-active" className="absolute -bottom-1.5 inset-x-0 h-px bg-current" />}
              </Link>
            ))}
          </div>
        </div>

        {/* Centre: the living logo */}
        <Link href="/" aria-label="Verella — home" className="flex justify-center" onMouseEnter={() => setShopOpen(false)}>
          <AnimatedLockup height={scrolled ? 26 : 34} compact={scrolled && !navOpen} className="text-current" />
        </Link>

        {/* Right */}
        <div className="flex items-center justify-end gap-5 md:gap-7" onMouseEnter={() => setShopOpen(false)}>
          <LanguageSwitcher locale={locale} className={`${linkClass} hidden md:inline-flex`} />
          {user ? (
            <div className="hidden items-center gap-6 lg:flex">
              {canAccessDashboard && (
                <Link href="/admin" className={linkClass}>
                  {dict.nav.dashboard}
                </Link>
              )}
              <Link href="/account" className={linkClass}>
                {dict.nav.account}
              </Link>
            </div>
          ) : (
            <Link href="/login" className={`${linkClass} hidden lg:inline`}>
              {dict.nav.login}
            </Link>
          )}
          {cartButton}
        </div>
      </div>

      {/* Shop mega panel — categories with a live photo preview. */}
      <AnimatePresence>
        {shopOpen && categories.length > 0 && (
          <motion.div
            className="absolute inset-x-0 top-full hidden border-b border-charcoal/10 bg-ivory text-charcoal lg:block"
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-10 px-10 py-10">
              <ul className="col-span-5 space-y-1">
                <li>
                  <Link href="/store" className="group flex items-center gap-4 py-2" onMouseEnter={() => setPreview(-1)}>
                    <span className="font-[family-name:var(--font-display)] text-3xl font-medium uppercase tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                      {dict.store.all}
                    </span>
                  </Link>
                </li>
                {categories.map((c, i) => (
                  <motion.li key={c.slug} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i + 0.1 }}>
                    <Link href={`/store?category=${c.slug}`} className="group flex items-baseline gap-4 py-2" onMouseEnter={() => setPreview(i)}>
                      <span className="text-[10px] tracking-[0.2em] text-gold-ink">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-[family-name:var(--font-display)] text-3xl font-medium uppercase tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                        {c.name}
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="col-span-7 grid grid-cols-2 gap-4">
                {[0, 1].map((offset) => {
                  const cat = categories[(Math.max(preview, 0) + offset) % categories.length];
                  return (
                    <div key={offset} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-charcoal">
                      <AnimatePresence mode="popLayout">
                        {cat?.image ? (
                          <motion.div
                            key={cat.slug}
                            className="absolute inset-0"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: EASE_OUT }}
                          >
                            <Image src={cat.image} alt="" fill sizes="30vw" className="object-cover" />
                          </motion.div>
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <VMark size={80} className="text-champagne/20" />
                          </span>
                        )}
                      </AnimatePresence>
                      <span className="absolute bottom-4 start-4 text-xs font-medium uppercase tracking-[0.25em] text-ivory">{cat?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            className="fixed inset-x-0 bottom-0 top-[var(--nav-offset,64px)] z-40 flex flex-col overflow-y-auto bg-ivory px-6 pb-10 pt-6 text-charcoal lg:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            <ul className="space-y-1">
              {[{ href: "/store", label: dict.store.all }, ...categories.map((c) => ({ href: `/store?category=${c.slug}`, label: c.name })), { href: "/about", label: dict.nav.about }].map(
                (l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, ease: EASE_OUT }}>
                    <Link href={l.href} onClick={() => setNavOpen(false)} className="block py-2 font-[family-name:var(--font-display)] text-4xl font-medium uppercase tracking-tight">
                      {l.label}
                    </Link>
                  </motion.li>
                ),
              )}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-charcoal/10 pt-6 text-xs font-medium uppercase tracking-[0.25em]">
              {user ? (
                <>
                  {canAccessDashboard && <Link href="/admin">{dict.nav.dashboard}</Link>}
                  <Link href="/account">{dict.nav.account}</Link>
                  <form action={logoutAction}>
                    <button type="submit" className="uppercase tracking-[0.25em]">
                      {dict.nav.logout}
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login">{dict.nav.login}</Link>
              )}
              <LanguageSwitcher locale={locale} className="text-gold-ink" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
