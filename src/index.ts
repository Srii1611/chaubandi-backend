/**
 * Chaubandi Medusa v2 Backend
 * ===========================
 * Premium Indian & Nepali Ethnic Wear E-commerce
 * Location: Arlington, MA
 *
 * Custom Modules:
 *   - appointments: Paid live-video shopping bookings ($10 Friday slots)
 *   - measurements: Per-customer body measurements for made-to-fit
 *
 * API Routes:
 *   Store:
 *     GET    /store/appointments/slots        — List available slots
 *     POST   /store/appointments              — Book an appointment
 *     POST   /store/appointments/pay          — Pay $10 fee via Stripe
 *     GET    /store/appointments              — My appointments
 *     GET    /store/measurements              — My measurements
 *     POST   /store/measurements              — Save/update measurements
 *     POST   /store/inspiration               — Submit design request
 *     GET    /store/inspiration               — My design requests
 *
 *   Admin:
 *     GET    /admin/appointments              — List all appointments
 *     POST   /admin/appointments/:id/confirm  — Confirm appointment
 *     POST   /admin/appointments/:id/cancel   — Cancel appointment
 *     GET    /admin/measurements              — List all measurements
 *     POST   /admin/measurements/:id/confirm  — Confirm measurements
 */

// Modules are auto-discovered by Medusa v2 file conventions
// No manual registration needed here
