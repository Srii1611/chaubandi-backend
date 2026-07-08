# How the Chaubandi Backend Works — A Step-by-Step Guide

> Written for anyone who needs to understand, run, or extend this system
> without having built it. Read top to bottom once; after that, jump to
> whichever section you need.

---

## 1. The Big Picture

Chaubandi is a **headless commerce** system. That means the website the
customer sees and the "brain" that manages products, orders, and payments
are two separate programs that talk over HTTP:

```
┌─────────────────────┐         HTTP requests          ┌──────────────────────┐
│  FRONTEND            │  ─────────────────────────►   │  BACKEND (this repo) │
│  Vite + React        │   "give me the products"      │  Medusa v2.17        │
│  C:\Clients\chaubandi│   "book an appointment"       │  localhost:9000      │
│  localhost:5173      │  ◄─────────────────────────   │                      │
└─────────────────────┘         JSON responses         └──────────┬───────────┘
                                                                  │
                                              ┌───────────────────┼───────────────────┐
                                              ▼                   ▼                   ▼
                                       ┌────────────┐      ┌───────────┐      ┌────────────┐
                                       │ PostgreSQL │      │  Stripe   │      │  SendGrid  │
                                       │ (Neon      │      │ (payments)│      │  (emails)  │
                                       │  cloud)    │      └───────────┘      └────────────┘
                                       └────────────┘
```

The five pieces:

| Piece | What it is | Where it lives |
|---|---|---|
| **Frontend** | The React website customers browse | `C:\Clients\chaubandi` |
| **Backend** | Medusa server: products, carts, orders, appointments, measurements | this folder |
| **Database** | Neon cloud PostgreSQL — all data lives here, survives restarts | cloud (connection string in `.env`) |
| **Stripe** | Charges cards ($10 appointment fee, future checkout) | external service |
| **SendGrid** | Sends notification emails to the owner | external service |

**Medusa** is an open-source e-commerce framework (like Shopify's engine,
but self-hosted and customizable). It gives us products, carts, checkout,
customers, and an admin dashboard for free. We added Chaubandi-specific
features on top: appointments, measurements, inspiration requests, and
store pickup.

---

## 2. Starting and Stopping the System (Daily Workflow)

```powershell
# 1. Open a terminal in this folder
cd "C:\Clients\chaubandi\Kimi_Agent_Medusa v2 Backend Build\chaubandi-backend-final"

# 2. Start the backend
npm run dev
# Wait for:  √ Server is ready on port: 9000

# 3. (In another terminal) start the frontend
cd C:\Clients\chaubandi
npm run dev
```

Then:
- **API**: http://localhost:9000 (health check: http://localhost:9000/health)
- **Admin dashboard**: http://localhost:9000/app — login `admin@chaubandi.com`
- **Storefront**: http://localhost:5173

Stop either with `Ctrl+C`. Nothing is lost — all data is in the cloud
database.

> ⚠️ **Windows quirk**: if you edit several backend files quickly while the
> server runs, the file-watcher sometimes crashes ("process not found").
> Just run `npm run dev` again.

---

## 3. Map of the Codebase

```
chaubandi-backend-final/
├── medusa-config.ts        ← THE control panel. Registers every module
│                              (payments, email, files, appointments,
│                              measurements) and reads .env
├── .env                    ← Secrets & settings (DB url, API keys). Never commit.
├── src/
│   ├── modules/            ← CUSTOM DATA + LOGIC (the "nouns")
│   │   ├── appointments/   ←   what an appointment IS and what it can DO
│   │   └── measurements/   ←   what a measurement profile IS
│   ├── api/                ← HTTP ENDPOINTS (the "doors" into the system)
│   │   ├── store/          ←   doors for customers
│   │   ├── admin/          ←   doors for the owner (auto-protected)
│   │   └── middlewares.ts  ←   the "bouncer": which doors need login
│   ├── subscribers/        ← REACTIONS to events ("when X happens, do Y")
│   ├── links/              ← connects custom data to Medusa data
│   └── scripts/seed.ts     ← fills an empty database with starter data
└── HOW-IT-WORKS.md         ← you are here
```

**The mental model**: *modules* define data and business logic, *API
routes* expose that logic over HTTP, *middlewares* guard the routes,
*subscribers* react to things happening. Everything is registered in
`medusa-config.ts`.

---

## 4. Core Concepts, One at a Time

### 4.1 Modules — the data layer

A module owns one kind of data. Look at
`src/modules/appointments/models/appointment.ts`:

```ts
export const AppointmentModel = model.define("appointment", {
  id: model.id({ prefix: "appt" }).primaryKey(),
  customer_id: model.text(),
  requested_date: model.dateTime(),
  time_slot: model.text(),                    // "10:30"
  status: model.enum(["requested", "confirmed", "completed", "cancelled"]),
  fee_paid: model.boolean().default(false),
  stripe_payment_intent_id: model.text().nullable(),
  notes: model.text().nullable(),
});
```

This one definition becomes a database table AND an auto-generated service
with methods like `listAppointments()`, `createAppointments()`,
`updateAppointments()`. The service file
(`src/modules/appointments/service.ts`) adds custom logic on top, e.g.
`getAvailableSlots()` which computes open Friday slots.

### 4.2 API routes — the doors

Medusa uses **file-based routing**: the folder path IS the URL.

```
src/api/store/appointments/route.ts        →  GET/POST  /store/appointments
src/api/store/appointments/slots/route.ts  →  GET       /store/appointments/slots
src/api/admin/appointments/[id]/confirm/   →  POST      /admin/appointments/:id/confirm
```

Each `route.ts` exports functions named after HTTP verbs (`GET`, `POST`).
Inside, they resolve a service from the container and call it:

```ts
const appointmentService = req.scope.resolve("appointments");
const slots = await appointmentService.getAvailableSlots(startDate, weeks);
res.json({ slots });
```

### 4.3 The two keys that guard every request

1. **Publishable API key** (`pk_...`) — every `/store/*` request must send
   header `x-publishable-api-key`. It scopes the request to the "Chaubandi
   Storefront" sales channel. Without it: empty catalog / 400 errors.
   The frontend has it in `C:\Clients\chaubandi\.env`.

2. **Customer login token** — routes that act on behalf of a person
   (booking, measurements, inspiration) additionally require a logged-in
   customer. `src/api/middlewares.ts` is the bouncer that enforces this.
   `/admin/*` routes are automatically restricted to admin users by Medusa.

### 4.4 Subscribers — automatic reactions

`src/subscribers/appointment-created.ts` says: *whenever an
`appointment.created` event fires, email the owner*. The booking route
emits that event after saving. Same pattern for inspiration requests
(`draft_order.created`). In development there's no Redis, so events run
in-memory inside the same process — fine for dev, use Redis in production.

### 4.5 The seed script — repeatable starter data

`npm run seed` creates (only if missing — it's safe to re-run):
US region → sales channel → publishable key → 9 categories → 20 products
→ 6.25% MA tax → **Arlington stock location with two fulfillment options**
(Standard Shipping $10, free store pickup).

---

## 5. The Five Customer Journeys, Step by Step

### Journey 1: Browsing the catalog
1. Frontend calls `GET /store/products` with the `pk_` header.
2. Medusa returns only products linked to the Chaubandi sales channel.
3. Each product has variants (sizes/colors) with USD prices.

### Journey 2: Booking a video appointment ($10, Fridays)
1. `GET /store/appointments/slots` (public) → list of Friday slots,
   10:00–18:00 in 30-min steps, already-booked ones flagged.
2. Customer registers/logs in (`/auth/customer/emailpass/...`) → token.
3. `POST /store/appointments` with date + slot → appointment saved with
   `status: requested`, event fires, owner gets an email.
4. `POST /store/appointments/pay` → creates a Stripe PaymentIntent for
   $10, returns a `client_secret`; the frontend confirms the card with
   Stripe.js, then calls `POST /store/appointments/pay/confirm` which
   verifies with Stripe and sets `fee_paid: true`.
5. Owner confirms in admin (`POST /admin/appointments/:id/confirm`) →
   `status: confirmed`.

Slot rules are all env-configurable: `APPOINTMENT_AVAILABLE_DAYS=5`
(Friday; add `6,0` for weekends), `APPOINTMENT_FEE_CENTS=1000`, start/end
hours, slot length.

### Journey 3: Saving body measurements
1. Logged-in customer: `POST /store/measurements` with bust/waist/hips/
   shoulder/length/sleeve/inseam + unit (in/cm).
2. One profile per customer — posting again updates it and resets
   `confirmed` to false (owner must re-approve after changes).
3. Owner reviews in admin and confirms before using for stitching.

### Journey 4: Custom-design inspiration request
1. Customer uploads a reference image (file storage: local `static/`
   folder in dev, Cloudflare R2 in production).
2. `POST /store/inspiration` with the image URL + garment type, fabric,
   color, occasion, budget, notes.
3. The backend creates a **draft order** carrying everything in metadata —
   it appears in the admin's Draft Orders where the owner can price it and
   turn it into a real order.
4. The owner gets an email with all details and the image link.

### Journey 5: Checkout with store pickup
1. Frontend creates a cart (`POST /store/carts`), adds items.
2. `GET /store/shipping-options?cart_id=...` returns **two options**:
   "Standard Shipping" ($10) and "Pick up at our Arlington store" (free).
3. Customer picks one, pays, order lands in the admin dashboard.

---

## 6. The Admin Dashboard (no code needed)

http://localhost:9000/app is the owner's control room — Medusa ships it
built-in. Products, categories, orders, draft orders (inspiration
requests), customers, inventory, and pricing are all managed there
visually. The custom things (appointments, measurements) are managed via
the `/admin/...` API endpoints for now; admin-UI widgets for them are a
possible future enhancement.

---

## 7. Environment Variables (.env) Explained

| Variable | What it does | Current state |
|---|---|---|
| `CHAUBANDI_DATABASE_URL` | Neon cloud Postgres connection. **This name is deliberate** — this PC has a system-wide `DATABASE_URL` from another project that would silently win otherwise. | ✅ working |
| `REDIS_URL` | Event queue. Unset in dev on purpose (in-memory fallback). | intentionally off |
| `JWT_SECRET` / `COOKIE_SECRET` | Sign login tokens/sessions. Random strings; change for production. | ✅ dev values |
| `STORE_CORS` etc. | Which frontend URLs may call the API. Includes `localhost:5173`. | ✅ set |
| `STRIPE_API_KEY` | Enables payments. | ⚠️ placeholder — payment endpoints return a clear 503 until set |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` / `OWNER_EMAIL` | Owner notification emails. Sender address must be verified in SendGrid. | ⚠️ placeholder — sends are attempted and logged, not delivered |
| `R2_*` | Cloudflare R2 file storage for production. Blank = local `static/` folder. | blank (local) |
| `APPOINTMENT_*` | Fee, days, hours, slot length. | ✅ $10, Fridays |

**When the real Stripe/SendGrid keys arrive**: paste them into `.env`,
restart the server. No code changes needed.

---

## 8. Where the Data Lives

Everything is in the Neon cloud database (~145 tables). The ones you'll
care about:

- `product`, `product_variant`, `product_category` — the catalog
- `customer` — registered shoppers
- `cart`, `order` — shopping and purchases (draft orders = inspiration requests)
- `appointment` — video-shopping bookings *(custom)*
- `measurement` — body measurement profiles *(custom)*
- `stock_location`, `shipping_option` — Arlington store, shipping/pickup
- `api_key` — the publishable key the frontend uses

Because it's a cloud DB, the same data is there no matter which machine
runs the server.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Catalog returns empty | Frontend not sending `x-publishable-api-key` | Send the header from frontend `.env` |
| 401 on booking/measurements | Customer not logged in | Register/login first, send `Authorization: Bearer <token>` |
| 503 "Payments are not configured" | Placeholder Stripe key | Put a real `sk_test_...` key in `.env`, restart |
| Emails not arriving | Placeholder SendGrid key / unverified sender | Real key + verify the from-address in SendGrid |
| Dev server dies after editing files | Windows watcher bug in `medusa develop` | Just `npm run dev` again |
| Data looks wrong/missing | Wrong database | Confirm `CHAUBANDI_DATABASE_URL` in `.env`; never rely on plain `DATABASE_URL` on this machine |
| Fresh database setup | New environment | `npx medusa db:migrate` → `npx medusa user -e ... -p ...` → `npm run seed` |

---

## 10. How to Explore and Learn More

1. **Click around the admin** (http://localhost:9000/app) — fastest way to
   build intuition for what the backend manages.
2. **Trace one journey through code**: start at
   `src/api/store/appointments/route.ts`, follow it into
   `src/modules/appointments/service.ts`, then peek at
   `src/subscribers/appointment-created.ts`. That single path touches
   every architectural idea in the project.
3. **Try the API by hand** (PowerShell):
   ```powershell
   $H = @{ "x-publishable-api-key" = "<pk_ from frontend .env>" }
   Invoke-RestMethod -Uri "http://localhost:9000/store/products?limit=3" -Headers $H
   Invoke-RestMethod -Uri "http://localhost:9000/store/appointments/slots?weeks=2" -Headers $H
   ```
4. **Official docs**: https://docs.medusajs.com — the "Learn" section
   mirrors the module/route/subscriber concepts above.

---

## 11. Current Status & What's Next

**Done and verified** (2026-07-06): server boots clean, catalog serves 20
products in 9 categories, appointments (slots → book → admin confirm),
measurements (save → confirm), inspiration requests (draft order + owner
email path), checkout offering free Arlington pickup + $10 shipping,
idempotent seed, migrations on Neon.

**Waiting on external keys**: real Stripe test/live keys, SendGrid key +
verified sender for `sushma@chaubandi.com`.

**Not yet started**: connecting the React frontend to this API (it
currently shows hardcoded data), and production hosting (Railway/Render/
VPS + Redis + R2 + production keys).
