import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import AppointmentService from "../../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../../modules/appointments";

/**
 * GET /store/appointments/slots
 * List available booking slots.
 * Query params:
 *   - start_date (optional): ISO date string, defaults to today
 *   - weeks (optional): number of weeks to look ahead, default 4
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const startDate = req.query.start_date
    ? new Date(req.query.start_date as string)
    : new Date();

  const weeks = req.query.weeks
    ? parseInt(req.query.weeks as string, 10)
    : 4;

  const slots = await appointmentService.getAvailableSlots(startDate, weeks);

  res.json({ slots });
}
