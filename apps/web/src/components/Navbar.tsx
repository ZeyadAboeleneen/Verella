"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AddedToCartDialog } from "@/components/AddedToCartDialog";
import { subscribeAddedToCart, type AddedToCartPayload } from "@/lib/cart/added-to-cart-bus";
import { stripLocalePrefix } from "@/lib/i18n/client";
import type { Dictionary, Locale } from "@/lib/i18n";

interface NavUser {
  name?: string | null;
  email?: string | null;
  permissions: string[];
}

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-0.5 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#57392D] px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Logo + brand name lockup, always in that fixed left-to-right order (icon
 * first, name second) regardless of page direction — see BrandMark's caller
 * for why this is wrapped in dir="ltr".
 *
 * Both assets are the official brand SVGs (Icon.svg / Name Arabic.svg),
 * cropped only to trim the large empty margin baked into their source export
 * (a print/presentation canvas) — every path, mask, and color inside is
 * untouched, so the complete mark and complete Arabic wordmark always render
 * in full, never simplified or partially cropped.
 *
 * The name itself DOES flip to match the active language: the Arabic wordmark
 * isn't a translated label, it's the brand's actual Arabic name, so it should
 * render (as the official artwork, not styled text) when the site is in
 * Arabic — only the icon+name ORDER stays fixed for consistent brand
 * recognition, not the name's own script/direction.
 */
function BrandMark({ locale, height }: { locale: Locale; height: number }) {
  // Intrinsic aspect ratios of the crisp brand assets — height is the only
  // thing callers choose; width follows so neither mark ever stretches.
  const iconWidth = Math.round(height * (989 / 930));
  const wordmarkWidth = Math.round(height * (551 / 212));

  return (
    <Link href="/" className="flex items-center gap-2.5 md:gap-3" aria-label="Verella — home">
      <span className="relative shrink-0 flex items-center justify-center" style={{ width: iconWidth, height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-icon-crisp.png"
          alt="Verella"
          width={iconWidth * 2}
          height={height * 2}
          className="h-full w-full object-contain"
        />
      </span>
      {locale === "ar" ? (
        <span className="relative shrink-0 flex items-center justify-center" style={{ width: wordmarkWidth, height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark-ar-crisp.png"
            alt="Verella"
            width={wordmarkWidth * 2}
            height={height * 2}
            className="h-full w-full object-contain"
          />
        </span>
      ) : (
        <span
          className="font-[family-name:var(--font-plus-jakarta)] font-bold text-[#57392D] whitespace-nowrap"
          style={{ fontSize: Math.max(16, Math.round(height * 0.44)) }}
        >
          Verella
        </span>
      )}
    </Link>
  );
}

export default function Navbar({
  dict,
  locale,
  user,
  cartCount,
}: {
  dict: Dictionary;
  locale: Locale;
  user: NavUser | null;
  cartCount: number;
}) {
  const pathname = stripLocalePrefix(usePathname());
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState<AddedToCartPayload | null>(null);

  useEffect(() => subscribeAddedToCart(setAddedToCart), []);

  const addedToCartDialog = (
    <AddedToCartDialog
      open={!!addedToCart}
      onClose={() => setAddedToCart(null)}
      productName={addedToCart?.name}
      productImage={addedToCart?.image}
      productMeta={addedToCart?.meta}
      locale={locale}
      labels={{
        title: dict.product.addedToCartTitle,
        continueShopping: dict.product.continueShopping,
        goToCart: dict.product.goToCart,
      }}
    />
  );

  const links = [
    { href: "/", label: dict.nav.home },
    { href: "/menu", label: dict.nav.menu },
    { href: "/store", label: dict.nav.store },
    { href: "/coffee", label: dict.nav.coffee },
    { href: "/about", label: dict.nav.about },
    { href: "/branches", label: dict.nav.branches },
  ];

  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      // Hide when scrolling down past the header, reveal on any scroll up.
      // The small delta threshold avoids flickering from momentum jitter.
      if (y < 80) {
        setHidden(false);
      } else if (y - lastY > 6) {
        setHidden(true);
      } else if (lastY - y > 6) {
        setHidden(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sticky elements further down the page (e.g. the menu's section nav) dock
  // against the header via this variable instead of a hard-coded offset.
  const navRef = useRef<HTMLElement>(null);
  // The "Added to cart" toast is anchored to the cart icon in this header, so
  // it needs the header on screen to anchor to — force it visible for as
  // long as the toast is up, even if the shopper had scrolled it away, and
  // let it resume normal scroll-hide behavior the moment the toast closes.
  const navVisible = !hidden || navOpen || !!addedToCart;
  useEffect(() => {
    const height = navVisible ? navRef.current?.offsetHeight ?? 60 : 0;
    document.documentElement.style.setProperty("--nav-offset", `${height}px`);
  }, [navVisible, scrolled]);

  // Lock page scroll while the mobile drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  const toggleNav = () => setNavOpen((prev) => !prev);
  const closeNav = () => setNavOpen(false);

  const navBg = navOpen
    ? "bg-[#F5F5DC] border-b border-[#e8d5bc]/60"
    : scrolled
    ? "bg-[#F5F5DC]/85 backdrop-blur-md shadow-sm border-b border-[#e8d5bc]/40"
    : "bg-[#F5F5DC]/95 border-b border-[#e8d5bc]/10";

  const navPy = scrolled ? "py-1 md:py-1.5" : "py-2 md:py-2.5";
  // Any granted admin permission is enough to show the link — dashboard.view
  // specifically only gates the KPI overview page, not dashboard access as a
  // whole (see proxy.ts and admin/layout.tsx, which use the same rule).
  const canAccessDashboard = !!user && user.permissions.length > 0;

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${navBg} ${
        navVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* ── Top bar ── */}
      <div className={`px-4 md:px-16 max-w-[1280px] mx-auto w-full transition-all duration-300 ease-in-out ${navPy}`}>

        {/* Mobile row: hamburger | logo+name | bag. Locked dir="ltr" so the
            hamburger/logo/cart trio keeps the same visual order in Arabic —
            only the brand name's own text flips to the Arabic wordmark. */}
        <div className="flex items-center justify-between gap-2 lg:hidden" dir="ltr">
          {/* Hamburger */}
          <button
            type="button"
            onClick={toggleNav}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            className="w-11 h-11 -ms-1.5 flex items-center justify-center text-[#000000] active:text-[#57392D] transition-colors shrink-0"
          >
            {navOpen ? <X size={24} strokeWidth={2} /> : <Menu size={24} strokeWidth={2} />}
          </button>

          <div className="min-w-0" onClick={closeNav}>
            <BrandMark locale={locale} height={42} />
          </div>

          {/* Shopping bag */}
          <div className="relative -me-1.5 shrink-0">
            <Link
              href="/cart"
              aria-label={dict.nav.cart}
              className="relative w-11 h-11 flex items-center justify-center text-[#000000] active:text-[#57392D] transition-colors"
            >
              <ShoppingCart size={22} strokeWidth={2} />
              <CartBadge count={cartCount} />
            </Link>
            {addedToCartDialog}
          </div>
        </div>

        {/* Desktop row: brand (logo+name) far left, nav+language+actions far
            right. Locked dir="ltr" so this macro layout never mirrors in
            Arabic — only the brand name text and nav labels themselves
            change language; icon/nav/cart position stays put for consistent
            brand recognition either way. */}
        <div className="hidden lg:flex items-center justify-between gap-6" dir="ltr">
          {/* Left: logo + name */}
          <div className="shrink-0">
            <BrandMark locale={locale} height={52} />
          </div>

          {/* Right: nav links, language switcher beside them, then account/cart/CTA */}
          <div className="flex items-center gap-5 xl:gap-7 min-w-0">
            <div className="flex items-center gap-5 xl:gap-7">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`whitespace-nowrap text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    pathname === href
                      ? "text-[#57392D] border-b-2 border-[#57392D] pb-1"
                      : "text-[#000000] hover:text-[#57392D]"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <LanguageSwitcher locale={locale} className="shrink-0 whitespace-nowrap text-[#000000] hover:text-[#57392D] text-xs font-semibold uppercase tracking-widest transition-colors" />

            <div className="h-4 w-px shrink-0 bg-[#e8d5bc]" aria-hidden="true" />

            {user ? (
              <div className="flex items-center gap-3 xl:gap-4">
                {canAccessDashboard && (
                  <Link href="/admin" className="shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-[#000000] hover:text-[#57392D]">
                    {dict.nav.dashboard}
                  </Link>
                )}
                <Link
                  href="/account"
                  className="shrink-0 max-w-[9rem] truncate text-xs font-semibold uppercase tracking-widest text-[#000000] hover:text-[#57392D]"
                >
                  {dict.nav.account}
                </Link>
                <form action={logoutAction} className="shrink-0">
                  <button type="submit" className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-[#000000] hover:text-[#57392D]">
                    {dict.nav.logout}
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-[#000000] hover:text-[#57392D]">
                {dict.nav.login}
              </Link>
            )}

            <div className="relative shrink-0">
              <Link
                href="/cart"
                aria-label={dict.nav.cart}
                className="relative flex h-9 w-9 items-center justify-center text-[#000000] hover:text-[#57392D] transition-colors"
              >
                <ShoppingCart size={18} strokeWidth={2} />
                <CartBadge count={cartCount} />
              </Link>
              {addedToCartDialog}
            </div>
            <Link
              href="/store"
              className="shrink-0 whitespace-nowrap bg-[#57392D] text-white px-6 xl:px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#412B22] transition-colors"
            >
              {dict.nav.orderNow}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer — overlays the page; backdrop closes it ── */}
      {navOpen && (
        <>
          {/* -z-10 keeps the backdrop behind the bar and drawer (both children of
              this stacking context) while it still overlays the page below. */}
          <div
            className="lg:hidden fixed inset-0 -z-10 bg-black/35"
            onClick={closeNav}
            aria-hidden="true"
          />
          <div className="lg:hidden absolute top-full left-0 right-0 bg-[#F5F5DC] border-t border-[#e8d5bc]/60 px-5 py-5 space-y-1 shadow-[0_16px_32px_-16px_rgba(39,25,8,0.25)] max-h-[calc(100dvh-var(--nav-offset,60px))] overflow-y-auto">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeNav}
                className={`block py-3 text-sm font-semibold uppercase tracking-widest border-b border-[#e8d5bc]/40 transition-colors ${
                  pathname === href ? "text-[#57392D]" : "text-[#000000]"
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="flex items-center justify-between py-3 border-b border-[#e8d5bc]/40">
              {user ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {canAccessDashboard && (
                    <Link href="/admin" onClick={closeNav} className="text-sm font-semibold uppercase tracking-widest text-[#000000]">
                      {dict.nav.dashboard}
                    </Link>
                  )}
                  <Link href="/account" onClick={closeNav} className="text-sm font-semibold uppercase tracking-widest text-[#000000]">
                    {dict.nav.account}
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="text-sm font-semibold uppercase tracking-widest text-[#000000]">
                      {dict.nav.logout}
                    </button>
                  </form>
                </div>
              ) : (
                <Link href="/login" onClick={closeNav} className="text-sm font-semibold uppercase tracking-widest text-[#000000]">
                  {dict.nav.login}
                </Link>
              )}
              <LanguageSwitcher locale={locale} className="text-sm font-semibold uppercase tracking-widest text-[#57392D]" />
            </div>

            <Link
              href="/store"
              onClick={closeNav}
              className="block mt-4 bg-[#57392D] text-white text-center py-4 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#412B22] transition-colors"
            >
              {dict.nav.orderNow}
            </Link>
          </div>
        </>
      )}
    </nav>
  );
}
