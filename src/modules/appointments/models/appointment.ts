import { model } from "@medusajs/framework/utils";

/**
 * Appointment Model
 * Represents a paid live-video shopping booking.
 */
export const AppointmentModel = model.define("appointment", {
  id: model.id({ prefix: "appt" }).primaryKey(),
  customer_id: model.text(),
  requested_date: model.dateTime(),
  time_slot: model.text(),
  status: model.enum(["requested", "confirmed", "completed", "cancelled"]).default("requested"),
  fee_paid: model.boolean().default(false),
  stripe_payment_intent_id: model.text().nullable(),
  notes: model.text().nullable(),
});
