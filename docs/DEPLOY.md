# Deploying the Chaubandi backend to Railway

The backend runs with **no third-party keys at all**. Stripe and SendGrid are
optional: without them the Stripe provider is simply not registered and emails
are printed to the server log. Deploy first, add keys when the client provides
them.

---

## 1. Prerequisites

- A Railway account and the repo pushed to GitHub
- A PostgreSQL 14+ database (Railway's Postgres plugin, or Neon)
- Node 20+ (Railway's Nixpacks builder picks this up from `engines` in
  `package.json`)

## 2. Create the service

1. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. If the backend is not at the repo root, set **Root Directory** to the
   backend folder in Settings → Source.
3. Railway reads `railway.toml`, so build and start commands, the `/health`
   check and the restart policy are already configured. Nothing to type.

## 3. Add the database

Either:

- **Railway Postgres**: Add → Database → PostgreSQL. Railway injects
  `DATABASE_URL` automatically. Also set `CHAUBANDI_DATABASE_URL` to the same
  value (see the note below).
- **Neon**: copy the pooled connection string into `CHAUBANDI_DATABASE_URL`.

> **Why two variables:** `medusa-config.ts` reads `CHAUBANDI_DATABASE_URL`
> first and only falls back to `DATABASE_URL`. This protects against a
> machine- or platform-level `DATABASE_URL` belonging to a different project —
> dotenv never overrides an already-set process env var. Always set
> `CHAUBANDI_DATABASE_URL` explicitly.

## 4. Set environment variables

Copy `.env.template` and set these in Railway → Variables. Only the first
group is required to boot:

| Variable | Required | Notes |
|---|---|---|
| `CHAUBANDI_DATABASE_URL` | ✅ | Postgres connection string |
| `JWT_SECRET` | ✅ | Long random string |
| `COOKIE_SECRET` | ✅ | Long random string, different from the above |
| `MEDUSA_BACKEND_URL` | ✅ | The public Railway domain, e.g. `https://chaubandi-backend.up.railway.app` |
| `STORE_CORS` | ✅ | Storefront origin(s), comma-separated |
| `ADMIN_CORS` | ✅ | Admin origin(s) — include the backend domain itself |
| `AUTH_CORS` | ✅ | Same origins as store + admin |
| `REDIS_URL` | — | Leave blank for one instance; required before scaling past one |
| `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Until set, payments return 503 `payments_not_configured` |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` / `OWNER_EMAIL` | — | Until set, emails are logged to the console |
| `R2_*` | — | Cloudflare R2 file storage; local disk is used if blank |
| `APPOINTMENT_DAYS` / `APPOINTMENT_TZ` | — | Default: Fridays, America/New_York |
| `PORT` | — | Set by Railway; do not override |

> **Uploads on Railway:** the container filesystem is ephemeral, so customer
> uploads written by the local file provider are lost on redeploy. Set the
> `R2_*` variables (or attach a volume) before the custom-design flow goes
> live.

## 5. Generate a public domain

Settings → Networking → **Generate Domain**. Put that URL in
`MEDUSA_BACKEND_URL`, then redeploy so admin links and placeholder image URLs
point at it.

## 6. Run migrations and seed

From Railway's shell (or locally with the production `CHAUBANDI_DATABASE_URL`):

```bash
npx medusa db:migrate     # schema
npm run seed              # region, sales channel, publishable key, tax, pickup
npm run seed:catalog      # 10 categories x 20 placeholder products + collections
npm run audit:placeholders  # confirm all 200 landed with full metadata
```

`npm run seed` prints the **publishable API key** — put it in the storefront's
`VITE_MEDUSA_PUBLISHABLE_KEY`. Both seeds are idempotent; re-running is safe.

## 7. Create an admin user

```bash
npx medusa user -e sushma@chaubandi.com -p '<strong-password>'
```

Then sign in at `https://<your-domain>/app`.

## 8. Verify

```bash
curl https://<your-domain>/health                 # → OK
curl -H "x-publishable-api-key: pk_..." \
     "https://<your-domain>/store/products?limit=5"
curl "https://<your-domain>/store/appointments/availability?month=2026-08"
```

## 9. Stripe webhook (once keys exist)

Stripe Dashboard → Developers → Webhooks → add endpoint:

```
https://<your-domain>/hooks/payment/stripe_stripe
```

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Boot fails on the database URL | `CHAUBANDI_DATABASE_URL` unset, or pointing at another project's DB |
| Storefront gets an empty catalog | Publishable key not linked to the sales channel — re-run `npm run seed` |
| CORS errors in the browser | Storefront origin missing from `STORE_CORS` / `AUTH_CORS` |
| Health check times out | App bound to the wrong port — do not set `HOST` or `PORT` manually |
| Uploaded images 404 after a deploy | Ephemeral disk; configure the `R2_*` variables |
