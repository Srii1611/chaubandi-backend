import { Module } from "@medusajs/framework/utils";
import AppointmentService from "./service";

/**
 * Appointments Module
 * Paid live-video shopping bookings with Stripe fee collection.
 */
export const APPOINTMENTS_MODULE = "appointments";

export default Module(APPOINTMENTS_MODULE, {
  service: AppointmentService,
});
