import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import MeasurementService from "../../../modules/measurements/service";
import { MEASUREMENTS_MODULE } from "../../../modules/measurements";

/**
 * GET /admin/measurements
 * List all measurements (admin only).
 * Query params:
 *   - customer_id: filter by customer
 *   - confirmed: filter by confirmation status
 *   - limit: pagination limit
 *   - offset: pagination offset
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const measurementService: MeasurementService = req.scope.resolve(
    MEASUREMENTS_MODULE
  );

  const filters: Record<string, any> = {};

  if (req.query.customer_id) {
    filters.customer_id = req.query.customer_id;
  }
  if (req.query.confirmed !== undefined) {
    filters.confirmed = req.query.confirmed === "true";
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset
    ? parseInt(req.query.offset as string, 10)
    : 0;

  const [measurements, count] =
    await measurementService.listAndCountMeasurements(filters, {
      take: limit,
      skip: offset,
    });

  res.json({ measurements, count, limit, offset });
}
