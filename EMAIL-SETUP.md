# Email Setup — Chaubandi

Everything is wired; email just needs **credentials + a verified sender**. Once
those are in `.env`, all of the flows below start sending automatically. No code
changes required.

## What sends email (already built)

| Trigger | Route / Subscriber | Goes to |
| --- | --- | --- |
| Customer places an order | `subscribers/order-placed.ts` (`order.placed`) | Customer (receipt) + owner (copy) |
| Newsletter signup (footer) | `POST /store/newsletter` | Subscriber (welcome + WELCOME10) + owner |
| Contact form | `POST /store/contact` | Owner |
| Custom Design request (with email) | `POST /store/contact` | Owner |
| Custom Design request (draft order) | `subscribers/inspiration-request-created.ts` | Owner |
| Appointment booking | `subscribers/appointment-created.ts` | Owner |

The storefront still opens WhatsApp for contact/design as an instant channel;
email is the durable copy. All calls fail quietly if the backend/provider is
offline, so the UI never breaks.

## To go live — fill these in `.env`

```
SENDGRID_API_KEY=SG.xxxxxxxx          # from SendGrid
SENDGRID_FROM_EMAIL=hello@chaubandi.com   # MUST be a verified sender/domain
OWNER_EMAIL=<Sushma's inbox>          # where notifications land
```

> **This is the "actual email from her later" step** — set `OWNER_EMAIL` to the
> address Sushma wants to receive orders/messages at, and `SENDGRID_FROM_EMAIL`
> to a verified sending address on the chaubandi.com domain.

### SendGrid note (dynamic templates)
`@medusajs/notification-sendgrid` sends through SendGrid **dynamic templates**.
For each flow, create a template in SendGrid and paste its ID into the matching
`SENDGRID_TEMPLATE_*` var in `.env`. The template can reference the data we pass
(`subject`, `order_no`, `total`, `items`, `customer_name`, `email`, `message`, …).

### Simpler alternative — Resend (recommended for custom-styled emails)
If you'd rather not build SendGrid templates, switch the provider to Resend,
which sends our built-in HTML directly (no template IDs needed):

1. `npm i @medusajs/notification-resend` (or `medusa-plugin-resend` per docs)
2. In `medusa-config.ts`, replace the `notification-sendgrid` provider block
   with the Resend provider, reading `RESEND_API_KEY` + `RESEND_FROM_EMAIL`.
3. Leave the `SENDGRID_TEMPLATE_*` vars blank — the inline `html`/`text` we
   already generate will be used as the email body.

Nothing else changes: every subscriber/route calls the provider-agnostic
`notificationService.createNotifications({ to, channel: "email", data })`.
