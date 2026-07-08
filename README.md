# Chaubandi Medusa v2 Backend

> Premium Indian & Nepali Ethnic Wear E-commerce Backend  
> Location: Arlington, MA | Built on Medusa v2.17.2

---

## Prerequisites

| Requirement | Version | Install Command |
|-------------|---------|-----------------|
| Node.js | v20+ LTS | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 14+ | [postgresapp.com](https://postgresapp.com) (Mac) or `brew install postgresql@15` |
| Redis | 7+ (optional for dev) | Not required locally — Medusa falls back to an in-memory event bus. Use Redis in production. |
| Stripe account | — | [stripe.com](https://stripe.com) (test keys are fine) |
| SendGrid account | — | [sendgrid.com](https://sendgrid.com) (free tier works) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url> chaubandi-backend
cd chaubandi-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.template .env
```

Edit `.env` with your values:

```env
# Database (required)
DATABASE_URL=postgres://user:password@localhost:5432/chaubandi

# Or use your Neon cloud DB:
# DATABASE_URL=postgresql://neondb_owner:.../neondb?sslmode=require

# Redis (required for subscribers)
REDIS_URL=redis://localhost:6379

# Medusa secrets (change in production)
JWT_SECRET=your-random-secret-here
COOKIE_SECRET=your-random-secret-here

# Stripe (required for payments)
STRIPE_API_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# SendGrid (required for email notifications)
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=sushma@chaubandi.com
OWNER_EMAIL=sushma@chaubandi.com

# File storage: leave R2_* blank to use local uploads/ folder
# Or set these to use Cloudflare R2:
# R2_ACCOUNT_ID=your_account_id
# R2_ACCESS_KEY_ID=your_key
# R2_SECRET_ACCESS_KEY=your_secret
# R2_BUCKET_NAME=chaubandi-uploads
# R2_PUBLIC_URL=https://your-account.r2.dev
```

### 3. Create the Database

```bash
# If using local PostgreSQL:
createdb chaubandi

# If using Neon, skip this — the database already exists.
```

### 4. Run Migrations

```bash
# Custom module migrations are already generated and committed
# (src/modules/*/migrations/). One command runs everything:
npx medusa db:migrate
```

### 5. Create Admin User

```bash
npx medusa user -e admin@chaubandi.com -p yourpassword
```

### 6. Seed Data

```bash
npm run seed
```

This creates: US region, sales channel, **publishable API key**, 9 product categories, ~20 sample products, and tax settings.

**Save the API key printed at the end** — your frontend needs it.

### 7. Start the Server

```bash
npm run dev
```

- API: `http://localhost:9000`
- Admin Dashboard: `http://localhost:9000/app`
- Health check: `GET http://localhost:9000/health`

---

## Frontend Integration

### Publishable API Key

Your Vite/React storefront **must** send this header on every `/store/*` request:

```javascript
// Example: fetching products
fetch("http://localhost:9000/store/products", {
  headers: {
    "x-publishable-api-key": "pk_...your_key_here",
  },
})
```

Without this header, the catalog returns empty.

### CORS

If your storefront runs on a different port (e.g., `http://localhost:5173`), add it to `.env`:

```env
STORE_CORS=http://localhost:5173,http://localhost:3000
```

---

## Custom Modules

### Appointments (`src/modules/appointments/`)

Paid live-video shopping bookings. $10 fee via Stripe.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/store/appointments/slots?start_date=YYYY-MM-DD&weeks=4` | Public | List available slots (Friday-only by default) |
| `POST` | `/store/appointments` | Customer | Book an appointment |
| `POST` | `/store/appointments/pay` | Customer | Pay $10 fee via Stripe (returns `client_secret` or captures immediately) |
| `POST` | `/store/appointments/pay/confirm` | Customer | Verify Stripe payment succeeded, mark fee paid |
| `GET` | `/store/appointments` | Customer | My appointments |
| `GET` | `/admin/appointments` | Admin | List all appointments |
| `POST` | `/admin/appointments/:id/confirm` | Admin | Confirm appointment |
| `POST` | `/admin/appointments/:id/cancel` | Admin | Cancel appointment |

**Environment:**
```env
APPOINTMENT_FEE_CENTS=1000          # $10.00
APPOINTMENT_AVAILABLE_DAYS=5        # 5=Friday (add 6,0 for Sat+Sun)
APPOINTMENT_START_HOUR=10
APPOINTMENT_END_HOUR=18
APPOINTMENT_SLOT_MINUTES=30
```

### Measurements (`src/modules/measurements/`)

Per-customer body measurements for made-to-fit garments.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/store/measurements` | Customer | Get my measurements |
| `POST` | `/store/measurements` | Customer | Save/update measurements |
| `GET` | `/admin/measurements` | Admin | List all measurements |
| `POST` | `/admin/measurements/:id/confirm` | Admin | Confirm measurements |

Fields: bust, waist, hips, shoulder, length, sleeve, inseam, unit (in/cm), source (manual/ai), confirmed, notes.

### Inspiration Upload (`src/api/store/inspiration/`)

Custom-design request flow via draft orders.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/store/inspiration` | Customer | Submit design request |
| `GET` | `/store/inspiration` | Customer | My design requests |

Body for POST:
```json
{
  "image_url": "https://...uploaded-image-url",
  "garment_type": "Lehenga",
  "fabric": "Silk",
  "color": "Red",
  "embroidery": "Zari work on border",
  "occasion": "Wedding",
  "budget": "1000-1500",
  "notes": "Want a matching dupatta"
}
```

### Store Pickup (BOPIS)

Native Medusa feature — no custom code needed.

- Stock location: **Arlington, MA** (configured in seed)
- Fulfillment option: **"Pick up at our Arlington store"** appears at checkout alongside shipping

---

## Email Notifications (SendGrid)

Two events trigger owner emails:

1. **New appointment booking** → `appointment.created` subscriber
2. **New inspiration request** → `draft_order.created` subscriber (filtered for `type: "inspiration_request"`)

Configure `OWNER_EMAIL` in `.env` to receive notifications.

For production: set up SendGrid templates named `appointment-booking-notification` and `inspiration-request-notification`, or use the default text/html content.

---

## Project Structure

```
chaubandi-backend/
├── medusa-config.ts              # Main config (Stripe, SendGrid, R2/local files)
├── .env.template                 # All env vars documented
├── package.json                  # Medusa v2.17.2 pinned
├── tsconfig.json
├── src/
│   ├── index.ts                  # Entry point with API docs
│   ├── scripts/
│   │   └── seed.ts               # Seed: region, categories, products, API key
│   ├── modules/
│   │   ├── appointments/         # $10 video booking module
│   │   │   ├── models/appointment.ts
│   │   │   ├── service.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── measurements/         # Body measurements module
│   │       ├── models/measurement.ts
│   │       ├── service.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── links/
│   │   ├── appointment-customer.ts
│   │   └── measurement-customer.ts
│   ├── api/
│   │   ├── middlewares.ts
│   │   ├── store/
│   │   │   ├── appointments/
│   │   │   │   ├── route.ts
│   │   │   │   ├── slots/route.ts
│   │   │   │   └── pay/route.ts
│   │   │   ├── measurements/
│   │   │   │   └── route.ts
│   │   │   └── inspiration/
│   │   │       └── route.ts
│   │   └── admin/
│   │       ├── appointments/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── confirm/route.ts
│   │       │       └── cancel/route.ts
│   │       └── measurements/
│   │           ├── route.ts
│   │           └── [id]/
│   │               └── confirm/route.ts
│   └── subscribers/
│       ├── appointment-created.ts
│       └── inspiration-request-created.ts
└── uploads/                      # Local file storage (dev)
```

---

## Troubleshooting

### "Catalog returns empty"
Make sure your frontend sends the `x-publishable-api-key` header on every `/store/*` request.

### "Migration would drop core tables"
This is a known Medusa v2 snapshot bug. If `medusa db:generate` produces a migration that drops `product`, `order`, `customer`, etc.:
```bash
# Delete snapshot files that reference tables outside the module
rm src/modules/*/migrations/.snapshot-*.json
# Regenerate
npx medusa db:generate <module-name>
```

### "Redis connection refused"
Make sure Redis is running:
```bash
redis-server --daemonize yes
# or
brew services start redis
```

### Stripe webhook for local dev
```bash
stripe listen --forward-to localhost:9000/hooks/payment/stripe_stripe
```

---

## Tech Stack

- **Medusa v2.17.2** — E-commerce framework
- **PostgreSQL 14+** — Database
- **Redis 7+** — Caching & event queue
- **Stripe** — Payments
- **SendGrid** — Email notifications
- **Cloudflare R2** — File storage (production) / local files (dev)
- **TypeScript** — Language

---

## License

MIT
