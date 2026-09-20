# Verella — Phase 1 Setup Guide

This is what was built, how to run it, and exactly what you need to do (and decide) next.

---

## 1. What's been built

A full-stack café platform on the architecture agreed in `docs/ARCHITECTURE.md`:

- **Database**: complete MySQL schema (39 tables) via Drizzle ORM in `packages/db` — auth/RBAC, customers, media, menu, store, CMS, promotions, cart, orders, payments, activity logs, plus POS/ERP-reserved tables. See `docs/DATABASE.md`.
- **Auth**: registration, login, logout, RBAC (roles: super_admin, admin, manager, staff, customer), route protection via `apps/web/src/proxy.ts`.
- **Admin dashboard** (`/admin`): Overview KPIs, Menu (categories/items/hero images), Store (categories/products), Discounts, Orders, Payments (InstaPay review queue), Customers, Users & Roles, Home Page (banners), Media Library, Settings, Activity Logs.
- **Public site**: `/menu` and `/store` now read from the database (bilingual-ready — English seeded, Arabic category names seeded, item/product Arabic text ready to fill in). Home page's Featured/Best Sellers sections are DB-driven.
- **Commerce**: guest + logged-in cart, checkout (delivery/pickup, address capture, discount codes), Cash on Delivery, InstaPay (screenshot upload → admin approve/reject), order tracking page.
- **Infra**: Docker Compose (MySQL, Next.js, Nginx), migrations, seed script. Media (product/menu/category images, hero banners, InstaPay payment proofs) is stored on **Cloudinary**, not self-hosted.

Full detail on decisions and scope trims is in section 6 below — read it before you assume something is missing.

---

## 2. Before you do anything: local environment check

This was built in a sandbox with **no Docker and no live MySQL available**, so nothing here has been run end-to-end against a real database yet. Everything typechecks (`pnpm -r typecheck`) and the production build succeeds (`pnpm --filter @verella/web build`), but you are the first to actually run it against real infrastructure. Budget time for first-run debugging.

You'll need on your machine (or VPS):
- **Docker + Docker Compose** (recommended path), or Node.js 20+/pnpm 10+ and a local MySQL 8 for a non-Docker dev setup.
- A **Cloudinary account** (free tier is fine) — Dashboard → Settings → API Keys gives you the Cloud Name / API Key / API Secret needed below.
- A **domain name** pointed at your VPS, if deploying for real (not required for local testing).

---

## 3. Get it running (Docker — recommended)

```bash
cd Verella-Web

# 1. Create your real env file from the template
cp .env.example .env
# Edit .env: set real passwords for MYSQL_ROOT_PASSWORD / MYSQL_PASSWORD,
# generate AUTH_SECRET (see below), fill in your domain in AUTH_URL, and set
# CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET from
# your Cloudinary dashboard. For local-only testing you can leave the domain
# fields as localhost and skip TLS — see section 3b.

# Generate AUTH_SECRET:
npx auth secret   # or: openssl rand -base64 33

# 2. Bring up MySQL + web + nginx
cd docker
docker compose up -d --build

# 3. Run migrations and seed the database (one-off job)
docker compose run --rm migrator
```

The seed script prints your **Super Admin login** to the console — by default:
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env` (defaults to `admin@example.com` / `ChangeMe123!` if unset — **change these in `.env` before seeding**, or change the password immediately after first login; there's no in-app "change password" UI yet, see section 6).

Visit `http://localhost` (or your domain). Admin dashboard is at `/admin`.

### 3b. TLS (production)

`docker/nginx.conf` currently serves plain HTTP on port 80. Once your domain's DNS points at the VPS:

```bash
sudo apt install certbot python3-certbot-nginx   # or your distro's equivalent
sudo certbot --nginx -d your-domain.example.com
```

Certbot will edit the Nginx config to add the 443 server block and redirect. Then update `.env`'s `AUTH_URL` to use `https://`, and restart: `docker compose up -d --build`.

---

## 4. Local development without Docker

```bash
pnpm install

# Point at a MySQL you're running locally (or via Docker just for that):
cp .env.example .env            # for pnpm db:* scripts
cp .env.example apps/web/.env.local   # Next.js only reads env files from its own app dir

# Edit both files: DATABASE_URL=mysql://root:yourpass@localhost:3306/verella,
# and CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
# from your Cloudinary dashboard.

pnpm db:generate   # only needed if you change the schema
pnpm db:migrate
pnpm db:seed
pnpm dev           # http://localhost:3000
```

---

## 5. Decisions and setup steps that are on you

These aren't things I could decide or configure for you:

1. **Change the seeded admin password immediately.** There's no self-service "change password" screen yet (see §6). Either update the row directly via SQL/Drizzle Studio (`pnpm db:studio`) with a fresh bcrypt hash, or add a change-password action before going live.
2. **Real product/menu photos.** The store is seeded with stock placeholder images (hosted on Cloudinary, same pipeline as real uploads) so it isn't empty on first run. Replace them via **Media Library → upload → edit each product/item → Choose image**.
3. **Arabic translations.** Category names are seeded in Arabic; menu item and store product names/descriptions are English-only. Fill these in via each item/product's edit form (Name (Arabic) / Description (Arabic) fields) — the storefront falls back to English automatically wherever Arabic is missing.
4. **InstaPay account details.** There's no InstaPay number/QR shown anywhere in the checkout flow — you need to add your actual InstaPay handle/QR image somewhere customers see it before they pay (e.g., add it to the `checkout.instapayUploadHint` dictionary string in `apps/web/src/lib/i18n/dictionaries/en.json` / `ar.json`, or a dedicated content block).
5. **Delivery fee / zones.** Phase 1 uses a single flat delivery fee (`Settings` page, defaults to EGP 30) for every address, regardless of distance. A real per-zone/per-governorate fee table is a POS/ERP-phase feature per the agreed architecture.
6. **Order/status notifications.** Nothing emails or texts the customer when their order status changes — this was flagged as an open, non-blocking question in `docs/ARCHITECTURE.md` and no channel (email vs. WhatsApp/SMS) was chosen. Needs a decision + an SMTP/WhatsApp API provider before it can be built.
7. **DNS + domain** for the VPS, and running the certbot step above.
8. **Database backups.** `docker-compose.yml` persists MySQL to a named Docker volume, but nothing ships it offsite. Set up `mysqldump` on a cron job before this holds real customer data. Media itself doesn't need a separate backup plan — it's on Cloudinary, which retains and can restore assets (Settings → Backup) independently of this app's infra.

---

## 6. What's deliberately scoped down (and why)

Being upfront about corners cut for time, so nothing here surprises you later:

- **Password reset / email verification flows**: the `password_resets` and `verification_tokens` tables exist and registration marks `emailVerifiedAt`, but there's no "forgot password" UI or email-sending integration yet (no SMTP configured — see §5.6, this needs the same provider decision).
- **Activity Logs**: the schema and dashboard viewer are complete, but only order-status changes, payment approvals/rejections, and user role/status changes currently write log entries. Extending it to every CRUD action (menu/store/discount edits, etc.) is the same one-line `logActivity()` call added to each remaining action in `apps/web/src/lib/*/actions.ts` — straightforward, just not done everywhere yet.
- **Home page "Shop by Category" section** (`apps/web/src/sections/Categories.tsx`) is still hand-crafted static content — it's a bespoke 3-tile bento layout, not a simple list, so making it fully DB-driven means redesigning the layout logic, not just wiring data. Banners *are* fully DB-driven (Home Page → banners in the dashboard).
- **Discount stacking** is intentionally simple: automatic (codeless) discounts always apply to matching lines, plus at most one customer-entered code — no complex priority/exclusivity rules. Good enough for launch promos; revisit if you need more sophisticated campaigns.
- **Stock decrement on checkout** isn't fully race-condition-proof under high concurrency (uses an atomic SQL decrement but no hard floor-check-and-abort inside the transaction). Fine at café order volumes; would need tightening before high-concurrency flash-sale scenarios.
- **No automated test suite.** Everything was verified via `tsc --noEmit` (clean across all 3 packages) and a successful `next build` (all 33 routes compile, correctly split between static and dynamic). No unit/integration/e2e tests exist yet — recommend adding these incrementally, prioritizing checkout and payment flows.
- **Docker image dependency safety net**: `docker/Dockerfile`'s runner stage overlays a full production `node_modules` on top of Next's `output: standalone` trace, because a local build showed the trace leaving `.next/standalone/node_modules` nearly empty (missing `mysql2`, `drizzle-orm`, etc. as real files — Next may have correctly inlined them into the compiled chunks instead, which would make this unnecessary, but it couldn't be verified without Docker in this sandbox). This costs some image size but removes the risk. See the comment in the Dockerfile for how to safely try removing it once you've confirmed a plain image boots correctly.
- **Cart badge count** in the navbar doesn't show a live item count (cart icon just links to `/cart`).
- **Locale switching** has no UI control yet — the mechanism (cookie-based, `dir="rtl"` switching, dictionaries) is fully wired, but there's no visible language toggle button on the site for a user to click. Add one that sets the `verella_locale` cookie and reloads.

None of these block a real launch — they're the natural "Phase 1.1" punch list.

---

## 7. Reference

- `docs/ARCHITECTURE.md` — system architecture and the four locked decisions (bilingual, self-hosted, separate menu/store modules, guest checkout).
- `docs/DATABASE.md` — full schema reference, table by table.
- `docs/ROADMAP.md` — the original 9-milestone plan (now implemented).
- `.env.example` — every environment variable, with comments.
- `packages/db/src/seed.ts` — exactly what data gets created on first seed (roles, permissions, branch, payment methods, settings, full menu + store catalog).
