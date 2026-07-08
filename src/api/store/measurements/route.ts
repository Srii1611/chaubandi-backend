import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import MeasurementService from "../../../modules/measurements/service";
import { MEASUREMENTS_MODULE } from "../../../modules/measurements";
import { CreateMeasurementDTO } from "../../../modules/measurements/types";

/**
 * GET /store/measurements
 * Get the authenticated customer's measurements.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const measurementService: MeasurementService = req.scope.resolve(
    MEASUREMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const measurement = await measurementService.getByCustomer(customerId);

  if (!measurement) {
    return res.status(404).json({ message: "No measurements found" });
  }

  res.json({ measurement });
}

/**
 * POST /store/measurements
 * Create or update the authenticated customer's measurements.
 * Body: { bust?, waist?, hips?, shoulder?, length?, sleeve?, inseam?, unit?, notes? }
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const measurementService: MeasurementService = req.scope.resolve(
    MEASUREMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const {
    bust,
    waist,
    hips,
    shoulder,
    length,
    sleeve,
    inseam,
    unit,
    notes,
  } = req.body as CreateMeasurementDTO;

  // Validate numeric fields
  const numericFields = { bust, waist, hips, shoulder, length, sleeve, inseam };
  for (const [key, val] of Object.entries(numericFields)) {
    if (val !== undefined && val !== null && (typeof val !== "number" || val <= 0)) {
      return res.status(400).json({ message: `${key} must be a positive number` });
    }
  }

  // Validate unit
  if (unit && !["in", "cm"].includes(unit)) {
    return res.status(400).json({ message: "unit must be 'in' or 'cm'" });
  }

  const measurement = await measurementService.upsertForCustomer(customerId, {
    bust: bust ?? null,
    waist: waist ?? null,
    hips: hips ?? null,
    shoulder: shoulder ?? null,
    length: length ?? null,
    sleeve: sleeve ?? null,
    inseam: inseam ?? null,
    unit: unit || "in",
    source: "manual",
    notes: notes || null,
  });

  res.status(201).json({ measurement });
}
