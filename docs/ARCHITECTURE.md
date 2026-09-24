> **Historical document.** Written for the Hamid Afandi café project this codebase was copied from. The menu module, branches and CMS tables it mentions have been removed. Current state: `HANDOVER.md`; setup and deployment: `docs/SETUP.md`.

# Verella — System Architecture (Phase 1)

> Status: **Plan for approval.** No application code is written yet.
> Scope: café website + Admin Dashboard, on a MySQL schema built to later absorb POS and ERP.

---

## 1. Decisions locked

| # | Decision | Choice | Consequence |
|---|----------|--------|-------------|
| 1 | Localization | **Bilingual Arabic + English, RTL** | Translation tables for catalog; per-locale JSON for CMS; `dir` switching + logical CSS + Arabic font |
| 2 | Hosting / DB | **Self-hosted VPS + MySQL** | Docker Compose: MySQL + Next app + MinIO + Nginx. POS/ERP share the same MySQL on the network |
| 3 | Catalog model | **Separate Menu & Store modules** | Distinct `menu_*` and `store_*` tables; shared `media`, `users`, `discounts`, `orders` |
| 4 | Checkout | **Guest checkout allowed** | `carts`/`orders` allow `user_id = NULL`; guest→user merge on auth |

**Confirmed scope:**
- Menu is a **display-only digital menu** (view/QR, no cart) in Phase 1. The **Store** is the e-commerce channel with cart + checkout. POS will order menu items later.
- Store fulfillment: **Delivery + Pickup** (address + delivery fee for delivery; collect-in-store for pickup).
- **No VAT/tax** in Phase 1 (prices all-inclusive; tax tables stay reserved).
- Store products track a **simple `stock_qty`** (decrement on order, flag when out); full inventory is a POS/ERP-phase concern.

---

## 2. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | Already in place — kept |
| Styling | Tailwind 4 | Already in place; add RTL logical properties + Arabic font |
| Database | MySQL 8 (InnoDB, utf8mb4) | Shared substrate for web / POS / ERP |
| ORM / migrations | **Drizzle ORM** | SQL-first; emits plain-SQL migrations a non-Node POS/ERP can read |
| Auth | **Auth.js v5** (credentials + DB sessions) | One `users` table for customers + staff; RBAC in DB |
| Validation | **Zod** (shared in `packages/core`) | One schema for API + forms + DB boundaries |
| File storage | **MinIO** (S3-compatible, self-hosted) via presigned uploads | Media library + InstaPay screenshots |
| Dashboard UI | shadcn/ui + TanStack Table + React Hook Form | Fast admin CRUD, tables, dialogs |
| Money | `DECIMAL(12,2)` + `currency` column | Never string/float |

**Alternative on the table:** Prisma instead of Drizzle if you prefer its DX (trade-off: Prisma-specific migration format vs. plain SQL).

---

## 3. Repository structure (pnpm monorepo)

POS and ERP are explicitly coming and will share schema + domain logic, so the DB and business logic must **not** live inside the Next app.

```
verella/
├─ apps/
│  └─ web/                      # Next.js: public site + customer account + (admin) dashboard
│     └─ src/
│        ├─ app/
│        │  ├─ (site)/          # public: home, menu, store, about, branches, cart, checkout
│        │  ├─ (auth)/          # login, register, forgot-password
│        │  ├─ (admin)/         # dashboard — middleware + RBAC gated
│        │  └─ api/             # route handlers (webhooks, presigned uploads, public reads)
│        ├─ components/
│        ├─ sections/
│        └─ lib/                # app-only glue (session, i18n runtime, fetchers)
├─ packages/
│  ├─ db/                       # ← SOURCE OF TRUTH: Drizzle schema, migrations, seed
│  ├─ core/                     # domain services (order pricing, discount resolution), Zod schemas, shared types
│  └─ ui/                       # shared components (later)
├─ docker/                      # Dockerfile, docker-compose.yml, nginx.conf
└─ docs/
```

**Layering:** `packages/db` (tables) → `packages/core` (services) → `apps/web` (thin HTTP/UI). Phase 1 keeps the dashboard as an `(admin)` route group inside `apps/web`; it can be extracted to `apps/admin` later with no schema change. POS becomes `apps/pos` reusing `db` + `core`.

---

## 4. Localization strategy (AR/EN + RTL)

- **Locales:** `en`, `ar`. Default configurable in `settings`.
- **Catalog & structured content** → dedicated translation tables (`*_translations` with `locale`, `name`, `description`). Clean to query per language and ERP-friendly.
- **Flexible CMS** (home content blocks, banners) → JSON payload keyed by locale.
- **UI:** `dir="rtl"` on `<html>` when `ar`; use Tailwind logical properties (`ps-`/`pe-`, `ms-`/`me-`), mirror only where needed; load an Arabic display font (e.g. IBM Plex Arabic / Cairo) alongside the existing Latin fonts.
- **Routing:** locale prefix (`/ar/...`, `/en/...`) or cookie-based — decide at build; middleware handles negotiation.
- **Admin dashboard** is bilingual-capable; content editors get side-by-side EN/AR fields per translatable entity.

---

## 5. Auth & access control

- Single `users` table (customers and staff). A user's capabilities come from **roles → permissions**.
- **RBAC tables:** `roles`, `permissions`, `role_permissions`, `user_roles` (role optionally scoped to a `branch_id` for future multi-branch staff).
- Passwords: Argon2id (or bcrypt). Email/phone verification + password reset tokens.
- **Dashboard gate:** middleware on `(admin)` requires an authenticated user holding an admin-capable permission; per-section checks enforce granular permissions.
- **Guest checkout:** orders may have `user_id = NULL`; a `session_token` binds the guest cart. On login/register, guest cart + any guest orders (matched by contact) merge into the account.

---

## 6. Media & file storage

- `media` table is the registry; files live in **MinIO** buckets.
- **Presigned uploads:** browser uploads straight to MinIO; the app only records metadata → avoids serverless body limits and scales.
- InstaPay payment proof = a `media` row referenced by `payments.proof_media_id`; served via signed URLs (private bucket).

---

## 7. Hosting & deployment (self-hosted VPS)

- **Docker Compose services:** `mysql`, `web` (Next standalone), `minio`, `nginx` (TLS termination + reverse proxy + static/media caching).
- MySQL reachable on the private network so future POS/ERP containers/hosts connect directly.
- Backups: nightly `mysqldump` + MinIO bucket snapshot; retention policy.
- Migrations run as a release step (`drizzle-kit migrate`) before the web container starts.
- Secrets via `.env` (not committed) / Docker secrets.

---

## 8. Caching strategy

Replace today's blanket `force-dynamic` with intent:
- Public catalog/menu pages: static or ISR with **tag-based revalidation** — mutating a product in the dashboard revalidates its tags.
- Cart/checkout/account/dashboard: always dynamic (per-user).
- Media/CDN: long cache with content-hashed URLs.

---

## 9. Scalability risks & mitigations

| Risk | Mitigation |
|---|---|
| Shared raw DB across web/POS/ERP couples systems | Single migration owner (`packages/db`); prefer a write-API layer so external systems don't scribble directly |
| Prices as strings, Google-hosted images (current state) | Kill both early: numeric money + owned MinIO media |
| Offline POS sync later | Every table carries a `uuid`/`public_id` now to avoid ID collisions on sync |
| Multi-branch retrofit | `branch_id` on operational tables from day one |
| Serverless upload limits | Presigned direct-to-MinIO uploads |
| MySQL `ENUM` hard to alter across systems | Status via lookup tables / documented string constants |
| Blanket dynamic rendering | Tag-based revalidation (section 8) |

---

## 10. Open questions before build

Resolved: Menu = display-only ✓ · Fulfillment = Delivery + Pickup ✓ · No VAT in Phase 1 ✓ · Simple `stock_qty` ✓.

Still to confirm (non-blocking for schema; can decide at their milestone):
1. **Order notifications**: email only, or SMS/WhatsApp (common in Egypt)? — Milestone 6/7.
2. Locale routing: **path prefix** (`/ar`, `/en`) vs. cookie? — Milestone 0.
3. **Delivery zones/fees**: flat fee, per-zone table, or per-governorate? — Milestone 5.
