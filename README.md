# Verella

Storefront and dashboard for **Verella** — *Original Brands. One Destination.*
Next.js 16 (App Router) + MySQL (Drizzle ORM), English and Arabic, in a pnpm monorepo.

| Path | Contents |
| --- | --- |
| `apps/web` | The site: storefront (`src/app/(shop)`) and admin dashboard (`src/app/admin`) |
| `packages/db` | Drizzle schema, migrations, seed |
| `packages/core` | Shared pricing, discounts, validation, permissions (with unit tests) |
| `docker/` | Production stack: MySQL, app, Caddy (HTTPS), nightly backups |

```bash
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev
```

- **Setup & deployment:** [`docs/SETUP.md`](docs/SETUP.md)
- **Project status, open items, launch checklist:** [`HANDOVER.md`](HANDOVER.md)
- **All site copy (EN/AR):** `apps/web/src/lib/i18n/dictionaries/`

Built by [Digitiva](https://www.digitivaa.com/).
