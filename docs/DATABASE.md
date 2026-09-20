# Verella — Database Schema (MySQL 8, InnoDB, utf8mb4)

> Phase 1 tables are marked **[build]**. Future POS/ERP tables are **[reserve]** (designed now, created later).
> Conventions apply to every table unless noted.

## Conventions

- **PK:** `id BIGINT UNSIGNED AUTO_INCREMENT`.
- **External id:** `uuid CHAR(36)` (unique) on every business table — for external refs and future offline-POS sync.
- **Timestamps:** `created_at`, `updated_at` (UTC); `deleted_at NULL` for soft delete where relevant.
- **Money:** `DECIMAL(12,2)` + `currency CHAR(3)` (default `EGP`).
- **Multi-branch:** operational tables carry `branch_id` from day one (single branch seeded now).
- **Status:** lookup tables or documented string constants, not MySQL `ENUM`.
- **Translations:** catalog entities use `*_translations (entity_id, locale, ...)`, unique `(entity_id, locale)`.
- Index every FK, every `slug`, and common filters (`is_active`, `branch_id`, `status`).

---

## A. Identity & Access **[build]**

**users** — customers and staff share this table.
`id, uuid, email UNIQUE, phone, password_hash, full_name, avatar_media_id FK→media, status (active|suspended|pending), email_verified_at, phone_verified_at, last_login_at, timestamps, deleted_at`

**roles** — `id, uuid, name, slug UNIQUE, is_system BOOL, description`
**permissions** — `id, slug UNIQUE (e.g. orders.view), group`
**role_permissions** — `role_id FK, permission_id FK` (PK both)
**user_roles** — `user_id FK, role_id FK, branch_id FK NULL` (PK user+role+branch) — branch-scoped staff later.

**sessions** — Auth.js: `id, user_id FK, session_token UNIQUE, expires_at`
**verification_tokens** — `identifier, token, expires_at` (email/phone verify)
**password_resets** — `user_id FK, token, expires_at, used_at`

**activity_logs** — `id, actor_user_id FK NULL, action, entity_type, entity_id, changes JSON, ip, user_agent, created_at`

Seed roles: `super_admin, admin, manager, staff, customer`.

---

## B. Customers **[build]**

**customers** — profile extension of a user.
`id, uuid, user_id FK→users UNIQUE, loyalty_points INT default 0, notes, timestamps`

**addresses** — `id, uuid, customer_id FK NULL, guest_token NULL, label, recipient_name, phone, governorate, city, area, street, building, floor, apartment, landmark, lat, lng, is_default BOOL, timestamps`
(guest addresses attach via `guest_token`, migrated on registration.)

---

## C. Media **[build]**

**media** — `id, uuid, disk (minio), bucket, object_key, url, mime, width, height, size_bytes, alt, title, folder, uploaded_by FK→users, is_private BOOL, timestamps, deleted_at`

Referenced by FK (`*_media_id`) or join tables (e.g. `menu_item_media`).

---

## D. Menu module (display-only) **[build]**

**menu_hero_images** — `id, uuid, media_id FK, sort_order, is_active, timestamps`

**menu_categories** — `id, uuid, slug UNIQUE, icon, image_media_id FK NULL, sort_order, is_active, timestamps`
**menu_category_translations** — `category_id FK, locale, name, description` — UNIQUE(category_id, locale)

**menu_items** — `id, uuid, category_id FK, slug, price DECIMAL(12,2), currency, image_media_id FK NULL, is_featured BOOL, is_new BOOL, is_active BOOL, sort_order, timestamps`
**menu_item_translations** — `item_id FK, locale, name, description, notes` — UNIQUE(item_id, locale)
**menu_item_badges** — `id, item_id FK, badge` (e.g. Popular/Heritage/Seasonal) or a `badge` column if single.

---

## E. Store module (e-commerce) **[build]**

**store_categories** — `id, uuid, slug UNIQUE, image_media_id FK NULL, sort_order, is_active, timestamps`
**store_category_translations** — `category_id FK, locale, name, description` — UNIQUE(category_id, locale)

**store_products** — `id, uuid, category_id FK, slug UNIQUE, sku, price DECIMAL(12,2), currency, compare_at_price NULL, is_best_seller BOOL, is_featured_home BOOL, is_active BOOL, sort_order, stock_qty INT NULL, rating DECIMAL(2,1) NULL, timestamps, deleted_at`
**store_product_translations** — `product_id FK, locale, name, description, notes` — UNIQUE(product_id, locale)
**store_product_media** — `id, product_id FK, media_id FK, sort_order, is_primary BOOL`

*(Variants/modifiers reserved — see section K — added when Store needs sizes/options.)*

---

## F. Home / CMS content **[build]**

**content_blocks** — `id, uuid, page (home|about|...), block_key, type, payload JSON (locale-keyed), sort_order, is_active, timestamps`
**banners** — `id, uuid, media_id FK, link_url, placement, starts_at, ends_at, sort_order, is_active, timestamps`; `banner_translations(banner_id, locale, title, subtitle, cta_text)`
**settings** — `id, group, key, value JSON, UNIQUE(group,key)` (site name, default_locale, currency, tax config, payment toggles…)

---

## G. Promotions **[build]**

**discounts** — `id, uuid, name, type (percent|fixed), value DECIMAL(12,2), scope (all|category|product), code VARCHAR NULL UNIQUE, min_order_total NULL, max_uses INT NULL, per_user_limit INT NULL, used_count INT default 0, starts_at, ends_at, is_active, branch_id FK NULL, timestamps`
**discount_products** — `discount_id FK, store_product_id FK`
**discount_categories** — `discount_id FK, store_category_id FK`
**discount_redemptions** — `id, discount_id FK, order_id FK, user_id FK NULL, amount, created_at`

**tax_classes / tax_rates** **[reserve]** — region-based VAT.

---

## H. Cart **[build]**

**carts** — `id, uuid, user_id FK NULL, guest_token NULL, branch_id FK NULL, currency, status (active|converted|abandoned), expires_at, timestamps` — index(user_id), index(guest_token)
**cart_items** — `id, cart_id FK, store_product_id FK, quantity INT, unit_price_snapshot DECIMAL(12,2), notes, options JSON NULL, timestamps`

Guest cart (`guest_token`) merges into user cart on login.

---

## I. Orders **[build]**

**orders** — `id, uuid, order_number UNIQUE, customer_id FK NULL, guest_contact JSON NULL (name/email/phone), branch_id FK NULL, channel (web|pos|app), status (pending|confirmed|preparing|out_for_delivery|completed|cancelled), fulfillment_type (delivery|pickup), address_id FK NULL, subtotal, discount_total, tax_total, delivery_fee, grand_total, currency, placed_at, timestamps`
**order_items** — `id, order_id FK, store_product_id FK NULL, name_snapshot, sku_snapshot, unit_price, quantity, line_total, options JSON` — **snapshots** survive catalog edits.
**order_status_history** — `id, order_id FK, status, note, changed_by FK→users NULL, created_at`
**order_discounts** — `id, order_id FK, discount_id FK NULL, code, amount`

---

## J. Payments **[build]**

**payment_methods** — `id, code (cash_on_delivery|instapay|...), name, is_active, config JSON, sort_order`
**payments** — `id, uuid, order_id FK, method_id FK, amount, currency, status (pending|submitted|approved|rejected|refunded), provider_ref NULL, proof_media_id FK→media NULL, reviewed_by FK→users NULL, reviewed_at NULL, notes, timestamps`

- **InstaPay flow:** customer uploads screenshot → `payments.proof_media_id` set, `status=submitted` → admin reviews → `approved|rejected`.
- **Gateway-ready:** adding Stripe/Paymob = new `payment_methods` row + provider adapter in `core`; `provider_ref` holds the external id. No schema break.

**refunds** **[reserve]** — `id, payment_id FK, amount, reason, status, created_by`.

---

## K. Reserved for POS / ERP **[reserve]** (designed, not built in Phase 1)

- **Branches:** `branches (id, uuid, code, name, address, phone, timezone, currency, is_active)`.
- **Catalog options:** `product_variants (size/SKU/price_delta)`, `modifier_groups`, `modifiers`, `product_modifier_groups` — café add-ons; can back both menu & store.
- **Inventory:** `inventory_items`, `stock_movements (type in|out|adjust|transfer, qty, ref)`, `warehouses/locations`.
- **Procurement:** `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`.
- **Recipes:** `recipes (menu_item_id → ingredient_id, qty)`, `ingredients` (raw materials).
- **HR:** `employees (user_id)`, `shifts`, `attendance`, `payroll`.
- **Finance:** `expenses`, `accounts` (chart of accounts), `journal_entries`.
- **Dine-in / delivery:** `tables`, `reservations`, `delivery_zones`, `drivers`.
- **Loyalty / gifting:** `loyalty_transactions`, `coupons`, `gift_cards`.

Reports are **queries/views** over the above, not tables.

---

## Entity relationships (summary)

- `users 1—1 customers`; `users M—N roles`; `roles M—N permissions`.
- `menu_categories 1—N menu_items`; each has `*_translations` per locale.
- `store_categories 1—N store_products`; `store_products 1—N store_product_media`.
- `carts 1—N cart_items → store_products`.
- `customers/guest 1—N orders 1—N order_items`; `orders 1—N payments`; `orders 1—N order_status_history`.
- `discounts M—N store_products / store_categories`; `discounts 1—N discount_redemptions`.
- `media` referenced by users, menu, store, banners, payments.
