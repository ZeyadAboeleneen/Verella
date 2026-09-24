> **Historical document.** Written for the Hamid Afandi café project this codebase was copied from. The menu module, branches and CMS tables it mentions have been removed. Current state: `HANDOVER.md`; setup and deployment: `docs/SETUP.md`.

# Verella — Implementation Roadmap (Phase 1)

> Sequenced so each milestone is shippable and de-risks the next. No code starts until this plan is approved.

## Milestone 0 — Foundation
- Convert repo to pnpm monorepo (`apps/web`, `packages/db`, `packages/core`).
- `docker-compose`: MySQL 8, MinIO, Nginx, Next standalone.
- Drizzle wired to MySQL; migration + seed pipeline.
- Base env/secrets, i18n scaffolding (en/ar, RTL switch, Arabic font).
- **Exit:** `docker compose up` boots the current site against MySQL locally.

## Milestone 1 — Data model & migrations
- Implement schema groups A–J from `DATABASE.md` as Drizzle tables + SQL migrations.
- Seed: roles/permissions, one branch, payment methods, and **migrate existing `menuData.ts` / `products.ts` into MySQL** (prices → DECIMAL, images → media rows).
- **Exit:** all Phase 1 tables migrated; current static content lives in DB.

## Milestone 2 — Auth & RBAC
- Auth.js v5 (credentials + DB sessions), registration/login/logout, email/phone verify, password reset.
- RBAC middleware; `(admin)` route group gated.
- Guest session token + guest→user merge hook.
- **Exit:** admin can log in; dashboard shell is protected.

## Milestone 3 — Media library + Menu CMS
- Presigned MinIO uploads; media library UI.
- Menu dashboard: hero images, categories, items (bilingual fields, order, enable/disable, featured/new).
- Public `/menu` reads from DB with tag-based revalidation.
- **Exit:** menu fully editable from dashboard, reflected on site in both languages.

## Milestone 4 — Store CMS + public store
- Store dashboard: categories, products (bilingual, images, best-seller, featured-home, active).
- Discounts engine in `packages/core` (percent/fixed, scope all/category/product, date windows, codes).
- Public `/store`, product pages, home featured sections wired to DB.
- **Exit:** store catalog + discounts managed from dashboard.

## Milestone 5 — Cart & checkout
- Guest + user cart, quantity/remove/persist, merge on login.
- Checkout: address, fulfillment type, discount/code application, totals in `core`.
- Order creation with line snapshots + status history.
- **Exit:** a guest and a logged-in user can place an order.

## Milestone 6 — Payments (COD + InstaPay)
- COD path; InstaPay screenshot upload → `payments.submitted`.
- Dashboard payment review queue (approve/reject, view proof).
- Provider-adapter seam for future Stripe/Paymob.
- **Exit:** orders paid via COD/InstaPay; admin reviews proofs.

## Milestone 7 — Dashboard completion
- Overview KPIs, Orders management, Customers, Users & Roles, Home/Content editor, Settings, Activity Logs.
- Reusable data-table shell: search, filters, pagination across all sections.
- **Exit:** dashboard matches the SaaS-panel brief.

## Milestone 8 — Hardening & launch
- Caching/revalidation audit, rate limiting, input validation sweep (Zod), backups, error monitoring.
- Seed real content, QA in AR + EN, deploy to VPS.
- **Exit:** production launch of Phase 1.

## Deferred (POS/ERP — schema reserved now)
Inventory, suppliers/POs, recipes/ingredients, HR/shifts, finance/expenses, dine-in/reservations, delivery/drivers, loyalty/coupons/gift cards, multi-branch operations, reporting.
