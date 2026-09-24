# Verella — Handover

Last updated: 24 Sep 2026

This document is the full state of the Verella web project: what it is, how to run it,
everything that was done, what is unfinished, and what is known to be broken.

---

## 1. What this project is

Verella is a **premium multi-brand retail store** (fragrances, musk & oud, personal care,
women's and men's fashion). Brand line: *"Original Brands. One Destination."*

This repo started as a **copy of the Hamid Afandi coffee website** and is being converted
into Verella. It is a pnpm monorepo:

| Path | What it is |
| --- | --- |
| `apps/web` | The Next.js 16 site (storefront + admin dashboard), App Router |
| `packages/db` | Drizzle ORM schema, migrations, seed script (MySQL) |
| `packages/core` | Shared validation (zod), pricing, permissions, money, Egypt governorates |

Reference sources kept outside the repo:
`Verella-Brand-Guidelines.pdf`, `Verella-Brand-Assets.zip`, `Verella-Logo-Asset-Sheet.pdf`.

---

## 2. Running it locally

### MySQL (portable, no installer, no admin rights)

MySQL 8.4.6 was extracted to `%LOCALAPPDATA%\verella-mysql` (outside OneDrive on purpose —
OneDrive sync corrupts database files). It is **not** a Windows service, so it must be
started manually each session:

```bash
"C:/Users/zeyad/AppData/Local/verella-mysql/bin/mysqld.exe" --basedir="C:\Users\zeyad\AppData\Local\verella-mysql" --datadir="C:\Users\zeyad\AppData\Local\verella-mysql\data" --port=3306 --bind-address=127.0.0.1 --console
```

Root user has **no password** (local dev only). Connect with:

```bash
"C:/Users/zeyad/AppData/Local/verella-mysql/bin/mysql.exe" -h 127.0.0.1 -u root verella
```

### The site

```bash
pnpm install
pnpm db:migrate     # apply schema
pnpm db:seed        # demo catalog (only runs on an empty database)
pnpm dev            # http://localhost:3000
pnpm test           # core unit tests
```

Production deployment (Docker + automatic HTTPS) is documented step by step in
**`docs/SETUP.md`**.

To rebuild the demo data from scratch:

```bash
mysql -u root -e "DROP DATABASE verella; CREATE DATABASE verella CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm db:migrate && pnpm db:seed
```

### Dashboard login

```
URL:      http://localhost:3000/login   →  redirects to /admin
Email:    admin@example.com
Password: ChangeMe123!
```

Change this before anything goes live. Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in
the root `.env` to seed different credentials.

> I never logged into the dashboard myself — I don't type passwords into forms. Every
> admin screen builds and type-checks, but **the admin UI has not been clicked through
> end to end by me**. That is the single biggest untested area.

### Environment files

- `.env` (repo root) — used by `packages/db` (migrate/seed).
- `apps/web/.env.local` — used by Next.js at runtime. **Next only reads env files from
  `apps/web/`, not the repo root.**

Both now point at the local MySQL. Cloudinary keys are intentionally empty (see §6).

---

## 3. Security note — act on this

The original copy contained **live Hamid Afandi production credentials** in
`apps/web/.env.local`: the real production MySQL host/user/password on site4now.net, a
real Cloudinary API secret, and the production `AUTH_SECRET`. The dev server was
connecting to the live Hamid database on startup.

I removed them and generated a fresh `AUTH_SECRET` for Verella. **The old secrets are
still valid on Hamid's side — rotate the Hamid production DB password and Cloudinary
secret**, since they sat in a copied folder.

---

## 4. What has been done

### Rebrand / cleanup
- Packages renamed `@hamid/*` → `@verella/*`; root package `verella-web`.
- Hamid's menu module deleted entirely (routes, admin, DB tables, validation, permissions).
- Deleted coffee-era pages: `coffee`, `brewing-guides`, `sourcing`, `branches` (+ admin),
  `wholesale`, `careers`, plus the old home sections and the legacy CMS module
  (hero slides / category cards / Instagram / about-hero) and store hero images.
- Dropped the now-unused tables: `content_blocks`, `banners`, `banner_translations`,
  `store_hero_images`, and all `menu_*` tables.
- All Hamid logo artwork removed, including the OG share image and the app icons that
  were overriding the new ones.
- Order numbers now start `VR-` instead of `HA-`.
- Site defaults to **English**; Arabic only if the visitor picks it (browser-language
  sniffing removed).

### Brand system
- Official assets from the asset pack are in `apps/web/public/brand/`
  (lockups, wordmark, V mark, pattern tiles, PNGs). `currentColor` masters are used so
  colour comes from CSS.
- Palette (`apps/web/src/app/globals.css`): Deep Charcoal `#141414`, Warm Ivory `#F5F0E8`,
  Champagne `#C9A96A`, Gold Dark `#A8813E` (metallic for light backgrounds), Soft Beige
  `#DFD3C0`. Charcoal is the primary action colour; champagne is accent-only, per the
  guidelines.
- Fonts: **Jost** (Latin) + **Tajawal** (Arabic) via `next/font`, wired so every font role
  swaps automatically in Arabic.
- `AnimatedLockup` — the header logo draws its V, raises the letters left-to-right,
  collapses to the V mark on scroll, and redraws on hover. Path data is lifted verbatim
  from the official SVG (`components/brand/lockup-paths.ts`).

### Commerce (schema + flow)
- **Variants**: `store_variants` (+ translations) with per-size price, stock, SKU and
  compare-at. Cart lines and order lines carry `variantId`, and stock is deducted from the
  chosen variant. Order items snapshot the variant label and SKU.
- **Brand** is a text field on the product, with autocomplete from existing brands.
- **Shipping**: per-governorate fees for all 27 Egyptian governorates, with a default
  fallback fee. Addresses validate against the governorate list.
- **Payments**: five methods — cash on delivery, InstaPay, Vodafone Cash (all live), plus
  card and Apple Pay which are **switched off and blocked server-side until a gateway is
  connected**. Wallet payments require a transfer screenshot and appear in admin for review.
- Checkout is fully bilingual; guests give their name/phone once (taken from the address).
- Verified end-to-end with a real test order: totals, per-variant stock deduction, cart
  clearing and the confirmation page all correct.

### Security fixes made along the way
- Cart update/remove actions accepted **any** cart-line ID — anyone could edit or delete
  another shopper's cart. Now ownership-checked.
- Order emails interpolated customer-typed names into HTML unescaped (HTML injection).
  Now escaped.
- Admin-alert email fallback was a Hamid developer's personal Gmail; now the Verella address.

### Design direction (agreed with you)
- Stay inside the brand palette; energy comes from motion and typography, not new colours.
- Take cues from **aoiofficial.com**: full-bleed hero with neighbouring collection names at
  the edges, expanding category panels, tabbed product grid, editorial story blocks, an
  oversized index list with a cursor-following image.
- The V mark is the separator in the marquee (instead of stars).

### New front end (built, not yet visually reviewed with you)
`motion` (Framer Motion 13) + `lenis` smooth scroll are installed.

- `HeroShowcase` — full-screen slides per category, wipe transition, Ken Burns, prev/next
  category names, segmented progress, pauses on hover.
- `VMarquee` — endless ticker, V-mark separators, speeds up and leans with scroll velocity.
- `CategoryStrip` — AOI-style panels: click one and it expands with a photo zoom-out and
  staggered text; stacks vertically on mobile.
- `ProductShowcase` — tabs with a sliding underline, grid re-flows with layout animation.
- `Manifesto` — brand statement lit word-by-word on scroll.
- `EditorialFeature` — parallax photo with a clip-path reveal.
- `BrandIndex` — oversized brand names, photo follows the cursor on a spring.
- `Navbar` — centred animated logo, Shop mega-panel with live category preview,
  transparent over the hero, full-screen mobile menu.
- `ProductCard` — hover image swap, quick-add tray (tap "+" on touch), sold-out/discount
  badges, add-to-cart confirmation.
- `StoreBrowser` — sticky filter bar, search, filter drawer (brand, in-stock, sort),
  URL-synced state, animated grid.
- Rebuilt pages: home, store, about (written from the brand guidelines), contact, order
  confirmation, cart, checkout.
- Demo data: 17 products, 6 categories, 5 fictional brands, black-and-white picsum
  placeholder photos (two per product so hover swap works), a few sold-out and discounted.

### Production-readiness pass (24 Sep)

**Content (EN + AR, from the dictionaries):**
- FAQ rewritten for Verella (authenticity, sizes, payment, delivery, returns) with FAQ structured data.
- Shipping & Returns written with the agreed policy: 14-day returns on unopened items, opened
  fragrances / personal care non-returnable, 48-hour window for damaged or wrong items.
- Privacy Policy rewritten (references Egypt's PDPL 151/2020) and a new **Terms & Conditions** page
  (references Consumer Protection Law 181/2018). Both linked in the footer.
- Arabic: FAQ and shipping in the site's Egyptian voice; privacy and terms in formal Arabic.

**SEO:** localized titles/descriptions on every page (`meta` in the dictionaries), canonical +
hreflang en/ar, Open Graph + Twitter cards (the share image was being dropped on any page with its
own OG data — fixed), sitemap with Arabic alternates, robots.txt, Product / FAQ / Organization
JSON-LD. Bag, checkout, account, order and auth pages are `noindex`.

**Links:** new `components/LocaleLink.tsx` keeps the visitor's `/en` or `/ar` prefix. Before, every
internal link went through a 307 redirect (extra round-trip per click, and Arabic pages sent
crawlers to English). Crawled 85 internal URLs + all external links: no broken links, no redirects.

**Security / privacy:**
- Security headers (HSTS in production, `X-Frame-Options: DENY`, nosniff, referrer and permissions
  policy, CSP `frame-ancestors 'none'`).
- Cookie consent banner; GA4 loads only after "Accept" (`GA_MEASUREMENT_ID`, read at runtime).
  "Cookie settings" in the footer reopens it.
- **Checkout had no rate limit** — a script could place unlimited cash-on-delivery orders and drain
  stock. Now 8 orders/hour per IP. Honeypot spam traps on the contact and registration forms.
- The rate limiter keyed on the first `X-Forwarded-For` entry, which the client controls. Now uses
  the proxy-set `X-Real-IP` / last hop.
- **Bug fixed:** if the confirmation email failed to send, the order was already saved but the
  shopper saw an error (and would retry → duplicate order). Email failures are now logged instead.
- Seed refuses a weak admin password on a non-local database; demo catalog only with
  `SEED_DEMO_CATALOG=true`; the password is no longer printed to the logs.
- `.dockerignore` didn't exclude `apps/web/.env.local` (root patterns only), so it would have been
  copied into the image build. Fixed.
- Removed dead Hamid-era S3/MinIO code and the AWS SDK dependency.

**Deployment:** `docker/` now runs MySQL + app + **Caddy** (automatic Let's Encrypt certificate,
http→https and www→bare redirects — replaces the HTTP-only nginx config) + a nightly `mysqldump`
backup service. `.env.example` rewritten for production. The standalone server (what the image runs)
was booted locally and checked behind a simulated HTTPS proxy: pages 200, headers present.
Docker isn't installed on this machine, so **the image build itself has not been run** yet.

**Quality:**
- `packages/core` now has a Vitest suite (34 tests: money, order totals, order numbers, discount
  maths/validation/stacking, checkout & address validation). `pnpm test` at the root.
- Typecheck clean (3 packages), lint 0 errors (3 React Compiler notices about react-hook-form remain,
  harmless), production build passes.
- WCAG contrast: gold `#A8813E` on ivory is only 3.2:1, so small gold text now uses a deepened
  `gold-ink` `#7D5E28` (5.3:1); the brand gold stays for marks and icons. Placeholders and a few
  faint labels raised to AA.
- Mobile: every public page checked at 375px in both languages — no horizontal scrolling.
- Hero: prev/next category names overlapped the headline on desktop; they're now vertical labels at
  the edges, plus a side shade so the gold kicker reads on bright photos.
- The Material Symbols icon font (render-blocking) now loads only in the dashboard.

---

## 5. Known problems / open issues

1. ~~Hero photos look black.~~ **Resolved** — it only happens under `pnpm dev`, where Next resizes
   each remote photo on first request. In the production build the photo is there on first paint.
2. **The front end still needs a design review with you** (home / store / about on screen).
3. **The dashboard has not been clicked through.** Still the biggest untested area: product form
   with variants, settings (governorate fees, payment toggles), payment review. Needs someone to log
   in — I don't enter passwords.
4. **No uploads until Cloudinary keys are set** (`CLOUDINARY_*`). This includes the payment
   screenshot at checkout, so InstaPay / Vodafone Cash checkout fails without them.
5. **No real emails until SMTP is set** (`SMTP_URL`, `EMAIL_FROM`). Order confirmations, admin order
   alerts, contact messages and password resets are only printed to the server log otherwise.
6. **Card / Apple Pay need a gateway** (Paymob). Blocked server-side until integrated.
7. **The legal copy is a draft I wrote, not a lawyer.** Please have the business confirm the facts:
   2–5 business-day delivery, refunds within 7 business days via InstaPay/Vodafone Cash, customer
   pays return shipping, wallet orders cancelled if unverified after 48 hours. Add the legal entity
   name and address to Terms if Verella is a registered company.
8. The Docker image build has never been run (no Docker on this machine) — do a trial run on the
   server before pointing DNS at it.
9. Rate limits are in-memory: fine for one app container, needs Redis if you ever run several.
10. `.next` caches sometimes report stale type errors — delete `.next` if errors mention
    `validator.ts` / `routes.d.ts` (OneDrive also occasionally corrupts these generated files).
11. Port 3000 is occasionally held by the VPN client (EonVPNRoutingService).

---

## 6. Pre-launch checklist status

Your 20-item list, with what is already true:

| # | Item | Status |
| --- | --- | --- |
| 1 | Privacy policy page + footer link | **Done** — Verella content, EN + AR (draft, see §5.7) |
| 2 | Terms & conditions page + footer link | **Done** — `/terms`, EN + AR (draft, see §5.7) |
| 3 | No secrets in frontend files | Done — **still rotate Hamid's DB password + Cloudinary secret** (§3) |
| 4 | Force HTTPS | **Done** — Caddy redirect + HSTS; goes live with the Docker deploy |
| 5 | Cookie consent banner | **Done** |
| 6 | Unique SEO titles/descriptions | **Done** — every page, both languages |
| 7 | Open Graph + Twitter cards | **Done** |
| 8 | Favicon, all sizes | Done |
| 9 | sitemap.xml + robots.txt | Done — now with Arabic alternates |
| 10 | Alt text on images | Partial — images use product/category names; give real photos real alt text when uploading |
| 11 | Compress large images | Handled by `next/image` (AVIF/WebP, resized per device) — upload photos at ≤ 2500px |
| 12 | Page-speed audit | **Not done** — run PageSpeed Insights on the real domain with real photos |
| 13 | WCAG AA contrast | **Done** — palette measured, small gold text moved to AA `gold-ink` |
| 14 | Mobile responsiveness pass | **Done** at 375px, EN + AR; worth a check on a real phone |
| 15 | Custom 404 | Done |
| 16 | Broken link scan | **Done** — 0 broken, 0 redirect hops |
| 17 | Form validation both sides | Done |
| 18 | Spam protection on forms | **Done** — honeypots + per-IP rate limits (incl. checkout) |
| 19 | GA4 | **Done in code** — needs the `GA_MEASUREMENT_ID` |
| 20 | Clear CTA above the fold | Done |

---

## 7. Where things live

```
apps/web/src/
  app/(shop)/            storefront routes (home, store, about, cart, checkout, order, …)
  app/admin/             dashboard (products, categories, discounts, orders, payments,
                         customers, media, users, roles, settings, activity)
  components/brand/      Logo, AnimatedLockup, lockup-paths
  components/home/       HeroShowcase, VMarquee, CategoryStrip, ProductShowcase,
                         Manifesto, EditorialFeature, BrandIndex
  components/motion/     SmoothScroll (Lenis), Reveal / RevealText
  components/store/      StoreBrowser
  lib/store/queries.ts   catalog reads (categories, products, variants, brands)
  lib/cart, lib/checkout, lib/settings, lib/orders, lib/payments
  lib/i18n/dictionaries/ en.json, ar.json  ← all site copy
packages/db/src/schema/  drizzle tables
packages/db/src/seed.ts  demo catalog
packages/core/src/       validation, pricing, permissions, egypt.ts
```

All user-facing copy is in the two dictionary JSON files — that is the place to edit text.

---

## 8. What's left before launch

Needs you / the business (I can't do these):

1. **Hosting**: a VPS (2 GB RAM, Ubuntu, Docker) and the **domain** — then follow `docs/SETUP.md`.
2. **Cloudinary** account keys, **SMTP** credentials (e.g. Google Workspace, Zoho or Brevo), and the
   **GA4** measurement ID.
3. **Rotate Hamid's production DB password and Cloudinary secret** (§3).
4. **Log in to the dashboard** (locally or on the server) so it can be clicked through: create a
   product with sizes, set the governorate fees, toggle payment methods, approve a wallet payment.
5. **Confirm the policy facts** in §5.7 and give the legal entity details if there is one.
6. **Real products and photography** — the production seed creates categories, roles and settings
   only; products are added from the dashboard.
7. Decide on **Paymob** if card / Apple Pay are wanted at launch.

Then on the live domain: run PageSpeed Insights, submit `sitemap.xml` in Google Search Console, and
test one real order per payment method.
