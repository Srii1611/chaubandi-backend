import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type { IEventBusModuleService } from "@medusajs/framework/types";
import AppointmentService from "../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../modules/appointments";

/**
 * POST /store/appointments
 * Create a booking request.
 * Body: { requested_date: string (ISO), time_slot: string ("HH:mm"), notes?: string }
 *
 * Requires authenticated customer (Medusa v2 auth).
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { requested_date, time_slot, notes } = req.body as {
    requested_date: string;
    time_slot: string;
    notes?: string;
  };

  if (!requested_date || !time_slot) {
    return res
      .status(400)
      .json({ message: "requested_date and time_slot are required" });
  }

  // Validate date format
  const dateObj = new Date(requested_date);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ message: "Invalid requested_date format" });
  }

  // Validate time_slot format (HH:mm)
  const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time_slot)) {
    return res
      .status(400)
      .json({ message: "time_slot must be in HH:mm format" });
  }

  const appointment = await appointmentService.createBooking({
    customer_id: customerId,
    requested_date: dateObj,
    time_slot,
    notes: notes || null,
  });

  // Module services don't auto-emit events â€” emit so the
  // appointment-created subscriber can notify the owner.
  const eventBus: IEventBusModuleService = req.scope.resolve(
    Modules.EVENT_BUS
  );
  await eventBus.emit(
    { name: "appointment.created", data: appointment },
    {}
  );

  res.status(201).json({ appointment });
}

/**
 * GET /store/appointments
 * List the authenticated customer's appointments.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const appointments = await appointmentService.listByCustomer(customerId);

  res.json({ appointments });
}
