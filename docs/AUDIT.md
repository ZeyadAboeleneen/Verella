> **Historical document.** Written for the Hamid Afandi café project this codebase was copied from. The menu module, branches and CMS tables it mentions have been removed. Current state: `HANDOVER.md`; setup and deployment: `docs/SETUP.md`.

# Verella — UI/UX & Functional Audit

> Status: **Report for review. No UI/UX changes have been made.** Awaiting approval before implementing.
> Method: full static review of every route/page/component + `packages/core`/`packages/db`; live MySQL connectivity + seed verification; successful production build (`next build`, 42 routes) exercising types + route/data collection. A live authenticated browser click-through of every screen was **not** performed (offer stands).
> Scope reviewed: 42 routes, ~130 source files.

Severity key: **C**ritical · **H**igh · **M**edium · **L**ow.

---

## 0. What was verified working

- DB connection to live `MYSQL5044.site4now.net/db_a9c631_rh` — 39 tables, all seed row counts correct, admin login bcrypt-verifies.
- Type checking passes across all 3 packages; production build succeeds for all 42 routes.
- Auth: credentials login, RBAC (roles→permissions), `(admin)` gate in both `proxy.ts` and the admin layout (defense in depth), server actions independently re-check permission.
- Order ownership check is correct (`getOwnedOrder` — logged-in orders verify customer; guest orders track by number).
- Checkout transaction is sound: atomic order+items+payment+status-history, stock decrement, discount redemption recording, cart conversion.
- Password features just added (change / forgot / reset) build and typecheck clean.

---

## 1. Critical

### C1 — Bilingual AR/EN + RTL is not actually rendered on the site
The agreed headline requirement is unfulfilled on the frontend. [layout.tsx](apps/web/src/app/layout.tsx) hardcodes `<html lang="en">` with **no `dir` attribute**, and fonts load `subsets: ["latin"]` only (no Arabic webfont). The i18n dictionaries, locale cookie, and admin Arabic fields all exist, but:
- The `<html dir>` never switches to `rtl`, so Arabic content renders left-to-right.
- No Arabic display font is loaded.
- **There is no language switcher** anywhere (navbar/footer) for users to change locale.
- Public components (Navbar, Footer, ProductCard, Store, home sections) use hardcoded English strings, not `dict`.
- **Impact:** high — the bilingual promise is effectively English-only today. **Effort:** medium–high (touches layout, fonts, a switcher, and swapping hardcoded strings to `dict`).

### C2 — Seeded admin password is a published default with no rotation until now
`admin@example.com` / `ChangeMe123!` appears in `.env.example`, `docs/SETUP.md`, and chat history. The new Change Password page (this phase) fixes the *mechanism*, but the live account still uses the known password. **Action needed from you:** log in and change it immediately. **Impact:** high (full-admin account takeover if the default is left). **Effort:** trivial (now that the page exists).

---

## 2. High

### H1 — Storefront has no product detail page
`ProductCard` only adds to cart; there is no `/store/[slug]` route. Shoppers can't view a product's full description, gallery, or a dedicated page to share/deep-link. Standard e-commerce expectation. **Effort:** medium.

### H2 — Checkout hides the amount the customer will pay
[checkout/page.tsx](apps/web/src/app/checkout/page.tsx) order summary shows **subtotal only** — no delivery fee, discount, or grand total. The final total first appears on the *post-order* confirmation page. Customers commit to an order without seeing what they'll pay. **Effort:** medium (needs a server-computed live-totals preview, ideally reacting to fulfillment type + code).

### H3 — No customer account area on the storefront
Logged-in customers cannot view order history, track orders, or manage saved addresses/profile. The `addresses` table and address-book concept exist in the schema but there's no UI. **Effort:** medium–high.

### H4 — Navbar is not auth-aware and has no cart state
[Navbar.tsx](apps/web/src/components/Navbar.tsx) has no Login/Account/Logout links and no admin Dashboard link; logout only exists inside the admin topbar. The cart icon shows **no item count**. Customers can't reach login/account from the header. **Effort:** low–medium.

### H5 — Home sections refetch the entire catalog repeatedly
[store/queries.ts](apps/web/src/lib/store/queries.ts): `getFeaturedHomeProducts` and `getBestSellerProducts` each call `getStoreProducts()` (all active products + all translations + all media), then filter in JS. The home page renders **both** sections plus Categories → the full catalog is fetched multiple times per page load, against a remote shared-host DB. **Effort:** low–medium (targeted queries with `WHERE is_featured_home` / `is_best_seller`, or one shared fetch).

### H6 — No caching strategy; every page hits the remote DB per request
Menu/Store/Home read the locale cookie → forced dynamic, no ISR/static, no tag-based revalidation (the agreed strategy). With site4now.net latency this means slow first paint on every visit. **Effort:** medium (revalidate-by-tag on catalog mutations; or locale via path segment to allow static).

### H7 — No rate limiting on auth-sensitive endpoints
Login, register, forgot-password, and InstaPay upload have no throttling → brute-force, email-enumeration timing, and upload-abuse exposure. (Forgot-password does use generic responses — good — but still needs a throttle.) **Effort:** medium (needs a store; DB or in-memory per-instance to start).

---

## 3. Medium

### Functional / correctness
- **M1 — `order_discounts` over-attribution.** In [checkout/actions.ts](apps/web/src/lib/checkout/actions.ts), when multiple discounts apply, every `order_discounts` row (and the code's `discount_redemptions` row) is written with the **full** `discountTotal` rather than that discount's own share → inflated per-discount records/reporting. Totals on the order are correct; the breakdown is not.
- **M2 — Stock oversell race (TOCTOU).** Stock is checked before the transaction and decremented inside it, without a re-check or a `stock_qty >= qty` guard in the `UPDATE`. Two concurrent orders can drive `stock_qty` negative.
- **M3 — Money formatting inconsistency.** Store queries build `` `EGP ${Number(price)}` `` (no decimals, no thousands separator, ignores `formatMoney`/locale), while cart/checkout/orders use `formatMoney`. Prices render inconsistently (e.g. "EGP 245" vs "EGP 1,250.00").
- **M4 — Rating defaults to 5 for unrated products.** `rating: p.rating ? Number(p.rating) : 5` shows a misleading 5.0 on products with no rating.
- **M5 — Store product form supports a single image.** [product-form.tsx](apps/web/src/components/admin/store/product-form.tsx) sends `mediaIds: [image.id]`, but `store_product_media` is one-to-many (gallery intended). No multi-image or reordering UI.
- **M6 — Footer links are all dead.** Every footer link (`Sourcing`, `Careers`, `Contact Us`, `FAQ`, `Shipping & Returns`, `Store Locator`, `Privacy Policy`, both social icons) is `href="#"`. Copyright is hardcoded `© 2024`. Legal pages referenced don't exist.
- **M7 — Admin lists cap at 100 rows with no pagination.** Orders (and similarly customers/products/activity) `.limit(100)` with no page controls → older records become unreachable as data grows.
- **M8 — Activity logging is partial.** `logActivity` is wired to order-status, payment-review, and user changes only; menu/store/discount/media/settings CRUD are not logged, so the audit trail is incomplete.

### UI/UX & consistency
- **M9 — Two visual design systems.** Public site (Navbar/Footer/ProductCard/Store/home) uses hardcoded hex (`#7b5800`, `#fff8f4`, `#0D0705`) + Material Symbols icons; admin/auth/cart/checkout use design tokens (`bg-primary`, `text-on-surface`, …) + lucide-react icons. Inconsistent color, iconography, and components across the app.
- **M10 — Confusing token semantics.** `--color-primary` is **black** while the brand gold (`#7b5800`) is `secondary` — so token-based primary buttons are black, but public CTAs are gold. The "primary" brand color isn't the brand color.
- **M11 — No loading states.** No `loading.tsx`/Suspense skeletons for DB-backed pages (menu, store, admin lists). On the remote DB, users see blank/janky waits.
- **M12 — No error boundaries / custom 404.** No `error.tsx` (app or admin) and no branded `not-found.tsx` → unhandled errors show Next's default page.
- **M13 — Admin dashboard is not usable on mobile.** [admin/layout.tsx](apps/web/src/app/admin/layout.tsx) uses a fixed `w-64` sidebar with `h-screen overflow-hidden` and no mobile drawer/collapse; forms use unconditional `grid-cols-2/3/4`. On phones the sidebar eats the screen and forms overflow.
- **M14 — Google-hosted external assets at build/runtime.** Material Symbols + `next/font/google` (Inter, Plus Jakarta) are fetched from Google; the Google Fonts fetch failed repeatedly during builds in this environment (build flakiness) and adds render-blocking third-party requests. `pattern-overlay` pulls a texture from transparenttextures.com. Self-hosting recommended.
- **M15 — All product/media images use `unoptimized`.** ProductCard, cart, and media library bypass Next image optimization → full-size images shipped, slower loads, more bandwidth.

### Security / config
- **M16 — Media features fail opaquely when S3/MinIO is unconfigured.** With empty S3 env (current state) uploads throw runtime errors with no "storage not configured" messaging. (The build-crash from empty S3 env was fixed this phase.)
- **M17 — `AUTH_URL=http://localhost:3000` in env.** Must be the real HTTPS domain in production or password-reset links and cookie security will be wrong.
- **M18 — No server-side content validation of uploads.** Presigned PUT lets the client upload arbitrary bytes to the object key; only client `accept="image/*"` + declared mime/size are checked, not actual content. A non-image (or oversized) file could be stored.
- **M19 — SEO gaps.** Only `/menu` sets custom metadata; no per-page titles/descriptions/OpenGraph, no `sitemap.xml`, no `robots.txt`.

### Accessibility
- **M20 — Accessibility gaps.** `<html>` lang never matches Arabic content (screen readers mispronounce); no skip-to-content link; decorative Material Symbols icons aren't `aria-hidden`; star rating has no text alternative ("4.9 out of 5"); checkout radio/checkbox groups lack `fieldset`/`legend`; low-contrast footer text (`opacity-60`, `text-white/60`) likely fails WCAG AA.

---

## 4. Low

- **L1 — Guest order numbers are guessable.** `HA-YYMMDD-XXXX` has only 4 random digits (10k/day). Guest orders (no account) are viewable by number, so they're weakly enumerable. Consider a longer random component or a per-order token.
- **L2 — Registration has no confirm-password field** (change/reset do), and no password strength meter or show/hide toggle on any password input.
- **L3 — Email verification not enforced.** `emailVerifiedAt` is set null on register but login is allowed; no verification email is sent.
- **L4 — No transactional emails.** No order-confirmation or payment approved/rejected notifications (Egypt: WhatsApp/SMS would be high-value later). Mailer scaffold now exists (SMTP + console fallback).
- **L5 — Soft-delete columns unused.** `deleted_at` exists but queries filter on `is_active`, not `deleted_at`; deletes appear to be hard deletes. Decide on one model.
- **L6 — Hardcoded copy** in many public components ("Featured Coffee", "Our Store", "Add to Cart", testimonials, Instagram gallery) — blocks both i18n and CMS-editability.
- **L7 — No storefront search** for menu/store.
- **L8 — `not-found`/empty-state styling** varies between screens.

---

## 5. Recommended implementation order

Grouped into phases by dependency and value. Each item lists **impact**.

### Phase A — Security & correctness hardening (do first; small, high-value)
1. **C2** rotate admin password (you) + confirm Change Password works. *Impact: closes account-takeover.*
2. **M17/M16** set real `AUTH_URL`; graceful "storage not configured" handling. *Impact: correct prod auth + clearer ops.*
3. **M1, M2** fix discount over-attribution + add `stock_qty >= qty` guard in the decrement `UPDATE`. *Impact: correct financial records + no oversell.*
4. **M3, M4** unify money formatting via `formatMoney`; stop defaulting rating to 5. *Impact: trustworthy prices/ratings.*
5. **H7** basic rate limiting on login/register/forgot/upload. *Impact: abuse resistance.*

### Phase B — Core UX completeness (the visible gaps)
6. **H2** checkout live totals (delivery + discount + grand total before placing). *Impact: conversion + trust.*
7. **H4** auth-aware navbar + cart count badge. *Impact: navigation/discoverability.*
8. **H1** product detail pages `/store/[slug]` + gallery (pairs with M5 multi-image). *Impact: e-commerce basics.*
9. **H3** customer account area (orders, addresses, profile). *Impact: retention/self-service.*

### Phase C — Bilingual/RTL (the headline requirement)
10. **C1** `<html lang/dir>` switching, Arabic font, language switcher, swap hardcoded public strings to `dict` (**L6**). *Impact: fulfills the core bilingual requirement.*

### Phase D — Performance & polish
11. **H5** targeted featured/best-seller queries. **H6** caching/revalidation. **M15** image optimization. **M14** self-host fonts/icons. *Impact: faster site, stable builds.*
12. **M9, M10** consolidate to one design system + fix token semantics. **M11, M12** loading/error/404 states. **M13** responsive admin (mobile drawer). *Impact: cohesive, resilient UI.*

### Phase E — Completeness & growth
13. **M6** footer links + legal pages. **M7** real pagination. **M8** full activity logging. **M18** upload content validation. **M19** SEO/sitemap. **M20/L2** accessibility + password UX. **L3/L4** email verification + transactional emails. **L7** search.

---

## 6. Notes on testing performed
- **Static:** every route, component, server action, query, and both shared packages read and reviewed.
- **Database:** live connection, table inventory, seed row counts, and admin bcrypt login verified against the production DB.
- **Build:** full `next build` green (types + all 42 routes compile + static routes prerender + build-time data collection).
- **Not yet done:** live authenticated click-through of each screen in a running browser (dev server), and cross-device responsive testing on real viewports. I can do this next if you want runtime confirmation before/after the fixes.
