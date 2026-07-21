# Chaubandi Backend API

Base URL: `http://localhost:9000` in dev, the Railway domain in production.

**Every `/store/*` request must send the publishable key:**

```
x-publishable-api-key: pk_...
```

Routes marked **customer** require an authenticated customer (session cookie or
`Authorization: Bearer <jwt>`). Routes marked **admin** require an admin
session. Everything else is public.

Standard Medusa store routes (`/store/products`, `/store/carts`,
`/store/orders`, `/store/customers`, …) work as documented by Medusa v2 and are
not repeated here.

---

## Health

### `GET /health`
Registered by the Medusa server itself. Returns `200 OK` with body `OK`.
This is the Railway healthcheck path.

---

## Catalog

The catalog is seeded by `npm run seed:catalog` into 10 categories, 20 products
each. Every seeded product carries `metadata.placeholder === true` plus the
storefront metadata contract:

| Key | Notes |
|---|---|
| `placeholder` | Always `true` for seeded products |
| `style_no` | e.g. `CH-LEH-001`, unique and sequential per category |
| `category` | One of the 10 canonical handles |
| `color`, `fabric` | Rotated from fixed pools |
| `work` | Apparel categories only |
| `occasion` | Array of 1–2 occasion handles |
| `pack_contains` | Apparel categories only |
| `can_can` | `lehengas` and `wedding-dresses` only |
| `style_tips`, `fit_tips`, `care` | Category-specific copy |
| `badge` | `New Arrival` / `Best Seller` / `null` (≤4 per category) |
| `customizable` | `true` for the six made-to-fit categories |

Category handles: `lehengas`, `sarees`, `wedding-dresses`, `salwars`, `suits`,
`blouses`, `kids-wear`, `accessories`, `shoes`, `jewellery`.

Occasion collections: `bridal`, `wedding-guest`, `sangeet-mehendi`, `festive`,
`party`, `everyday`. A product's *primary* occasion is its Medusa collection
(v2 allows one per product); the full list lives in `metadata.occasion`.

Every product has exactly one option titled `Size`.

---

## Measurements

Per-customer measurement chart for made-to-fit garments (Lashkaraa field set).
One row per customer. Any edit resets `confirmed` to `false`.

### `GET /store/customers/me/measurements` — **customer**
```json
{ "measurement": { "id": "meas_...", "unit": "in", "bust": 36, ... } }
```
Returns `{ "measurement": null }` when nothing has been saved yet.

### `POST /store/customers/me/measurements` — **customer**
Upsert. Send any subset; omitted fields keep their stored value.

```jsonc
{
  "unit": "in",                    // "in" | "cm"
  "height": 64,
  // Upper
  "bust": 36, "above_waist": 30, "waist": 28, "hips": 38,
  "shoulder_width": 14.5, "armhole": 16, "bicep": 11,
  "sleeve_length": 18, "sleeve_style": "3/4",
  "front_neck_depth": 7, "back_neck_depth": 8, "top_length": 40,
  // Lower
  "bottom_length_skirt": 41, "bottom_length_pant": 39,
  "thigh": 22, "knee": 15, "ankle": 10,
  "notes": "Please leave extra seam allowance"
}
```
`201` with the saved row. Numeric fields must be positive numbers.

### `GET|POST /store/measurements` — **customer**
Legacy alias of the two routes above; identical behaviour.

### `GET /admin/measurements` — **admin**
Query: `customer_id`, `confirmed`, `limit`, `offset`.

### `POST /admin/measurements/:id/confirm` — **admin**
Marks a chart as confirmed for stitching.

**Per-order measurements:** to attach a chart to a specific line item, pass it
in the cart line item's `metadata` when calling
`POST /store/carts/:id/line-items`. Line-item metadata is copied onto the order
at completion, so the owner sees it on the order in admin.

---

## Product reviews

Reviews are created as `pending` and appear on the storefront only after the
owner approves them. Nothing is seeded — there is no fabricated social proof.

### `GET /store/products/:id/reviews`
```json
{ "reviews": [], "count": 0, "average": null }
```
Approved reviews only, newest first. `average` is the mean rating to one
decimal, or `null` when there are none.

### `POST /store/products/:id/reviews`
```json
{ "customer_name": "Priya", "rating": 5, "title": "Beautiful", "body": "..." }
```
`rating` is an integer 1–5. Returns `201` with the pending review. Guests may
submit; a logged-in customer is linked automatically. `404` if the product
does not exist.

### `GET /admin/reviews` — **admin**
Moderation queue. Query: `status` (`pending` default, `approved`, `rejected`,
`all`), `product_id`, `limit`, `offset`.

### `POST /admin/reviews/:id/status` — **admin**
Body `{ "status": "approved" | "rejected" }`.

---

## Uploads

### `POST /store/uploads` — **customer**
`multipart/form-data` with a `files` field. Up to **5 files, 10 MB each**.
Accepted: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.

```json
{ "files": [{ "id": "...", "url": "https://.../inspiration-cus_123-....jpg" }] }
```

Errors: `400` no files / too many, `413` file too large, `415` bad MIME type.

Stored via the File Module — local disk in dev, Cloudflare R2 when the `R2_*`
variables are set.

---

## Custom design requests

### `POST /store/custom-design-requests`
Public. Creates a draft order carrying every field in metadata and emails the
owner.

```jsonc
{
  "name": "Priya S.",            // required
  "email": "priya@example.com",  // required
  "garment_type": "Lehenga",     // required
  "phone": "+1 555 0100",
  "occasion": "Wedding",
  "event_date": "2026-11-14",
  "budget_range": "$800-1200",
  "notes": "Emerald with gold zari",
  "image_urls": ["https://.../inspiration-....jpg"]   // from POST /store/uploads
}
```
`201` with `{ draft_order, message }`.

### `POST /store/inspiration` — **customer**
Earlier single-image version of the same flow
(`image_url`, `garment_type`, `fabric`, `color`, `embroidery`, `occasion`,
`budget`, `notes`). Still supported.

### `GET /store/inspiration` — **customer**
Lists the caller's own requests.

---

## Appointments

Paid live-video shopping sessions. Defaults to Fridays, 10:00–18:00, 30-minute
slots — configurable via `APPOINTMENT_DAYS`, `APPOINTMENT_START_HOUR`,
`APPOINTMENT_END_HOUR`, `APPOINTMENT_SLOT_MINUTES`, `APPOINTMENT_TZ`.

### `GET /store/appointments/availability?month=YYYY-MM`
Public. Calendar view for greying out unbookable dates.
```json
{
  "month": "2026-08",
  "timezone": "America/New_York",
  "days": [{ "date": "2026-08-01", "available": false, "slots_total": 0, "slots_available": 0 }]
}
```

### `GET /store/appointments/slots?start_date=YYYY-MM-DD&weeks=4`
Public. Individual time slots with a booked/free flag.

### `POST /store/appointments` — **customer**
```json
{ "requested_date": "2026-08-07", "time_slot": "14:30", "notes": "..." }
```
`201` with the appointment in status `requested`. Emits `appointment.created`,
which notifies the owner.

### `GET /store/appointments` — **customer**
The caller's own bookings.

### `POST /store/appointments/pay` — **customer**
```json
{ "appointment_id": "appt_...", "payment_method_id": "pm_..." }
```
Creates a $10 PaymentIntent (`APPOINTMENT_FEE_CENTS`). With
`payment_method_id` it confirms server-side and returns
`{ success: true, appointment }`; without it, returns `{ client_secret }` for
Stripe.js.

**Without a Stripe key:** `503 { "code": "payments_not_configured", "message": ... }`

### `POST /store/appointments/pay/confirm` — **customer**
```json
{ "appointment_id": "appt_..." }
```
Verifies the PaymentIntent succeeded and marks the fee paid. Same `503` shape
when Stripe is unconfigured.

### `GET /admin/appointments` — **admin**
### `POST /admin/appointments/:id/confirm` — **admin**
### `POST /admin/appointments/:id/cancel` — **admin**

---

## Storefront forms

### `POST /store/contact`
`{ name, email, message }` — emails the owner.

### `POST /store/newsletter`
`{ email }` — subscribes and emails the owner.

### `GET /store/reviews`
Boutique-level Google rating and up to 5 featured Google reviews (cached 12h).
Returns `{ "configured": false, ... }` until `GOOGLE_PLACES_API_KEY` and
`GOOGLE_PLACE_ID` are set, so the storefront can fall back to curated content.
This is the *boutique* rating — per-product reviews are the
`/store/products/:id/reviews` routes above.

---

## Behaviour without credentials

| Missing | Effect |
|---|---|
| `STRIPE_API_KEY` | Provider not registered; payment routes return `503 payments_not_configured`; catalog, cart and orders unaffected |
| `SENDGRID_API_KEY` | Emails printed in full to the server console; no crash |
| `REDIS_URL` | In-memory event bus, cache and lock |
| `R2_*` | Files written to local `static/` |
| `GOOGLE_PLACES_API_KEY` | `/store/reviews` returns `configured: false` |
