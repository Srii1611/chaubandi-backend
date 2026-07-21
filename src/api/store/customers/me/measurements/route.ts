import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import MeasurementService from "../../../../../modules/measurements/service";
import { MEASUREMENTS_MODULE } from "../../../../../modules/measurements";
import {
  MEASUREMENT_NUMERIC_FIELDS,
  type CreateMeasurementDTO,
} from "../../../../../modules/measurements/types";

/**
 * GET /store/customers/me/measurements
 * Return the authenticated customer's measurement chart.
 * 200 with `measurement: null` when nothing has been saved yet — an empty
 * chart is a normal state for the storefront form, not an error.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const measurementService: MeasurementService = req.scope.resolve(
    MEASUREMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const measurement = await measurementService.getByCustomer(customerId);
  res.json({ measurement });
}

/**
 * POST /store/customers/me/measurements
 * Upsert the authenticated customer's measurement chart. Any subset of the
 * Lashkaraa field set may be sent; omitted fields keep their stored value.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const measurementService: MeasurementService = req.scope.resolve(
    MEASUREMENTS_MODULE
  );

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const body = (req.body || {}) as Record<string, unknown>;

  for (const field of MEASUREMENT_NUMERIC_FIELDS) {
    const val = body[field];
    if (val === undefined || val === null) continue;
    if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) {
      return res
        .status(400)
        .json({ message: `${field} must be a positive number` });
    }
  }

  if (body.unit && !["in", "cm"].includes(body.unit as string)) {
    return res.status(400).json({ message: "unit must be 'in' or 'cm'" });
  }

  const payload: Omit<CreateMeasurementDTO, "customer_id"> = {
    unit: body.unit as any,
    sleeve_style:
      body.sleeve_style !== undefined ? (body.sleeve_style as string) : undefined,
    notes: body.notes !== undefined ? (body.notes as string) : undefined,
    source: "manual",
  };
  for (const field of MEASUREMENT_NUMERIC_FIELDS) {
    if (body[field] !== undefined) {
      (payload as any)[field] = body[field];
    }
  }

  const measurement = await measurementService.upsertForCustomer(
    customerId,
    payload
  );

  res.status(201).json({ measurement });
}
