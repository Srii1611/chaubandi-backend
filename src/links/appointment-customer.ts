import { defineLink } from "@medusajs/framework/utils";
import AppointmentsModule from "../modules/appointments";
import CustomerModule from "@medusajs/medusa/customer";

/**
 * Read-only link: Appointment -> Customer
 * Resolves appointment.customer_id to the customer record,
 * so queries can expand `appointment.customer.*`.
 */
export default defineLink(
  {
    linkable: AppointmentsModule.linkable.appointment,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
);
