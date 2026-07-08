import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import AppointmentService from "../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../modules/appointments";

/**
 * GET /admin/appointments
 * List all appointments (admin only).
 * Query params:
 *   - status: filter by status
 *   - customer_id: filter by customer
 *   - limit: pagination limit
 *   - offset: pagination offset
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const filters: Record<string, any> = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.customer_id) {
    filters.customer_id = req.query.customer_id;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset
    ? parseInt(req.query.offset as string, 10)
    : 0;

  const [appointments, count] = await appointmentService.listAndCountAppointments(
    filters,
    { take: limit, skip: offset, order: { requested_date: "ASC" } }
  );

  res.json({ appointments, count, limit, offset });
}
