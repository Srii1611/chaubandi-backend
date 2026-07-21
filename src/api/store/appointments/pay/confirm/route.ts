import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import Stripe from "stripe";
import AppointmentService from "../../../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../../../modules/appointments";

/**
 * POST /store/appointments/pay/confirm
 * After the frontend confirms the PaymentIntent with Stripe.js,
 * verify it succeeded and mark the appointment fee as paid.
 *
 * Body: { appointment_id: string }
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { appointment_id } = req.body as { appointment_id: string };
  if (!appointment_id) {
    return res.status(400).json({ message: "appointment_id is required" });
  }

  const [appointment] = await appointmentService.listAppointments({
    id: appointment_id,
    customer_id: customerId,
  });

  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  if (appointment.fee_paid) {
    return res.json({ success: true, appointment });
  }

  if (!appointment.stripe_payment_intent_id) {
    return res
      .status(400)
      .json({ message: "No payment has been started for this appointment" });
  }

  const stripeKey = process.env.STRIPE_API_KEY;
  if (!stripeKey || stripeKey.includes("replace_me")) {
    return res.status(503).json({
      code: "payments_not_configured",
      message: "Payments are not configured yet (STRIPE_API_KEY missing).",
    });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      appointment.stripe_payment_intent_id
    );

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: `Payment not completed (status: ${paymentIntent.status})`,
      });
    }

    const updated = await appointmentService.markFeePaid(
      appointment.id,
      paymentIntent.id
    );
    res.json({ success: true, appointment: updated });
  } catch (error: any) {
    res.status(502).json({
      message: "Failed to verify payment",
      error: error.message,
    });
  }
}
