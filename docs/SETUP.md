# Verella — Setup & Deployment

How to run Verella locally and how to put it on a server. For project status
and open items, see `HANDOVER.md` at the repo root.

---

## 1. Local development

Requirements: Node 20+, pnpm 10, MySQL 8.

```bash
pnpm install
cp .env.example .env                  # used by pnpm db:* scripts
cp .env.example apps/web/.env.local   # used by Next.js (it only reads its own folder)
# In both: DATABASE_URL=mysql://root@127.0.0.1:3306/verella
#          AUTH_URL=http://localhost:3000, a fresh AUTH_SECRET,
#          SEED_DEMO_CATALOG=true if you want the demo products.

pnpm db:migrate
pnpm db:seed        # only runs on an empty database
pnpm dev            # http://localhost:3000
```

Checks to run before every deploy:

```bash
pnpm typecheck      # all 3 packages
pnpm lint
pnpm test           # packages/core unit tests (pricing, discounts, validation)
pnpm build
```

---

## 2. Production (a Linux VPS with Docker)

The stack in `docker/docker-compose.yml`:

| Service | What it does |
| --- | --- |
| `mysql` | MySQL 8.4, data in the `mysql-data` volume, reachable only from the server itself |
| `web` | The Next.js app (standalone build), port 3000 on the internal network only |
| `caddy` | Public entry point on 80/443. Gets and renews the Let's Encrypt certificate, redirects http → https and www → bare domain |
| `backup` | Nightly `mysqldump` into `docker/backups/`, keeps 14 days |
| `migrator` | One-off job: runs migrations, then the seed (seed skips itself if the DB already has data) |

A 2 GB RAM VPS is enough to start (the build itself needs ~2 GB; add swap on a 1 GB box).

### 2.1 First deploy

1. **DNS** — point an `A` record for `verella.com` **and** `www.verella.com` at the server's IP. Wait until `ping verella.com` shows it.
2. **Firewall** — open ports 80 and 443 (and 22 for SSH). Nothing else.
3. **Code + env** on the server:

   ```bash
   git clone <repo> verella && cd verella
   cp .env.example .env
   nano .env
   ```

   Fill in every value. In particular:
   - `DOMAIN`, `ACME_EMAIL`, `AUTH_URL=https://<domain>`
   - strong, different `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` (the latter also inside `DATABASE_URL`)
   - a new `AUTH_SECRET` (`openssl rand -base64 33`) — never reuse the local one
   - `CLOUDINARY_*` (uploads fail without them)
   - `SMTP_URL` + `EMAIL_FROM` (without them order emails are only written to the log)
   - `SEED_ADMIN_EMAIL` and a 12+ character `SEED_ADMIN_PASSWORD`
   - `GA_MEASUREMENT_ID` if you want Google Analytics
4. **Start it** — compose needs `--env-file` because `.env` lives one folder up:

   ```bash
   cd docker
   docker compose --env-file ../.env up -d --build
   docker compose --env-file ../.env run --rm migrator
   ```

5. Open `https://<domain>` — Caddy fetches the certificate on the first request (a few seconds). Log in at `/login` with the seeded admin, then **change the password** in the dashboard (Admin → Account) and remove `SEED_ADMIN_PASSWORD` from `.env`.

### 2.2 Updating

```bash
cd verella && git pull
cd docker
docker compose --env-file ../.env up -d --build web
docker compose --env-file ../.env run --rm migrator   # only if the release has new migrations
```

### 2.3 Backups

`docker/backups/` gets one `verella-YYYY-MM-DD.sql.gz` per day. That only
protects against mistakes — if the server dies, the backups die with it. Copy
them off the server daily (e.g. `rclone` to Google Drive/S3, or the VPS
provider's snapshot feature).

Restore:

```bash
gunzip -c docker/backups/verella-2026-09-24.sql.gz | docker compose --env-file ../.env exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" verella'
```

Product photos and payment screenshots live on Cloudinary, not on the server.

### 2.4 Logs

```bash
docker compose --env-file ../.env logs -f web      # app errors, emails when SMTP is off
docker compose --env-file ../.env logs -f caddy    # certificate / TLS problems
```

---

## 3. What's already handled in code

- **HTTPS**: Caddy redirects all http traffic; the app sends HSTS (2 years) in production.
- **Security headers**: `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, permissions policy, CSP `frame-ancestors 'none'` (`apps/web/next.config.ts`).
- **Rate limits** per IP on login, registration, password reset, contact form, payment-proof upload and order placement (`apps/web/src/lib/rate-limit.ts`). In-memory, so they assume a single `web` container.
- **Honeypot** spam trap on the contact and registration forms.
- **Cookie consent**: GA4 only loads after the visitor accepts; "Cookie settings" in the footer reopens the banner.
- **SEO**: per-page localized titles/descriptions, canonical + hreflang (en/ar), Open Graph + Twitter cards, `sitemap.xml` (with Arabic alternates), `robots.txt`, Product / FAQ / Organization structured data. Private pages (bag, checkout, account, order, auth) are `noindex`.
- **Seed safety**: the seed refuses a weak admin password on a non-local database, and skips the demo catalog unless `SEED_DEMO_CATALOG=true`.

---

## 4. Other hosting options

The app is a standard Next.js 16 standalone build, so it also runs on any Node
host (`pnpm build`, then `node apps/web/.next/standalone/apps/web/server.js`
with `apps/web/.next/static` and `apps/web/public` copied next to it — see
`docker/Dockerfile`). It needs a MySQL 8 database and the same environment
variables, plus `HOSTNAME=0.0.0.0`: bound to `127.0.0.1` instead, Next treats
the proxy's `/en`/`/ar` rewrite as an external URL and every page redirects
to itself. On hosts with more than one instance, move the rate limiter to a
shared store (Redis) first.
