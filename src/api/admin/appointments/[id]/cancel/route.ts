import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import AppointmentService from "../../../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../../../modules/appointments";

/**
 * POST /admin/appointments/:id/cancel
 * Cancel an appointment (admin only).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const { id } = req.params;

  try {
    const appointment = await appointmentService.cancelAppointment(id);
    res.json({ appointment });
  } catch (error: any) {
    res.status(404).json({ message: error.message || "Appointment not found" });
  }
}
