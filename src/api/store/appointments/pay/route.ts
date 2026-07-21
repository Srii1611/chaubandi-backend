import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import Stripe from "stripe";
import AppointmentService from "../../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../../modules/appointments";

/**
 * POST /store/appointments/pay
 * Pay the $10 appointment fee via Stripe.
 *
 * Body: { appointment_id: string, payment_method_id?: string }
 *
 * - With payment_method_id: attempts to confirm the charge server-side.
 *   Returns { success: true, appointment } if captured immediately.
 * - Without: creates a PaymentIntent and returns { client_secret } for
 *   the frontend to confirm with Stripe.js, then call
 *   POST /store/appointments/pay/confirm to mark the fee paid.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { appointment_id, payment_method_id } = req.body as {
    appointment_id: string;
    payment_method_id?: string;
  };

  if (!appointment_id) {
    return res.status(400).json({ message: "appointment_id is required" });
  }

  // Verify appointment exists and belongs to customer
  const [appointment] = await appointmentService.listAppointments({
    id: appointment_id,
    customer_id: customerId,
  });

  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  if (appointment.fee_paid) {
    return res.status(400).json({ message: "Fee already paid" });
  }

  const stripeKey = process.env.STRIPE_API_KEY;
  if (!stripeKey || stripeKey.includes("replace_me")) {
    return res.status(503).json({
      code: "payments_not_configured",
      message:
        "Payments are not configured yet (STRIPE_API_KEY missing). Set a Stripe key in .env.",
    });
  }

  const feeCents = parseInt(process.env.APPOINTMENT_FEE_CENTS || "1000", 10);
  const stripe = new Stripe(stripeKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeCents,
      currency: "usd",
      metadata: {
        appointment_id: appointment.id,
        medusa_customer_id: customerId,
        type: "appointment_fee",
      },
      ...(payment_method_id
        ? {
            payment_method: payment_method_id,
            confirm: true,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never",
            },
          }
        : {
            automatic_payment_methods: { enabled: true },
          }),
    });

    if (paymentIntent.status === "succeeded") {
      const updated = await appointmentService.markFeePaid(
        appointment.id,
        paymentIntent.id
      );
      return res.json({ success: true, appointment: updated });
    }

    // Store the intent reference; frontend confirms with Stripe.js
    await appointmentService.updateAppointments({
      id: appointment.id,
      stripe_payment_intent_id: paymentIntent.id,
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      appointment_id: appointment.id,
    });
  } catch (error: any) {
    res.status(502).json({
      message: "Payment processing failed",
      error: error.message,
    });
  }
}
