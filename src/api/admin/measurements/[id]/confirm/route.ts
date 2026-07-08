import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import MeasurementService from "../../../../../modules/measurements/service";
import { MEASUREMENTS_MODULE } from "../../../../../modules/measurements";

/**
 * POST /admin/measurements/:id/confirm
 * Confirm measurements for stitching use (admin only).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const measurementService: MeasurementService = req.scope.resolve(
    MEASUREMENTS_MODULE
  );

  const { id } = req.params;

  try {
    const measurement = await measurementService.confirm(id);
    res.json({ measurement });
  } catch (error: any) {
    res.status(404).json({ message: error.message || "Measurement not found" });
  }
}
