import { model } from "@medusajs/framework/utils";

/**
 * Measurement Model
 * Per-customer body measurements for made-to-fit garments.
 * Supports both manual and AI-sourced measurements.
 */
export const MeasurementModel = model.define("measurement", {
  id: model.id({ prefix: "meas" }).primaryKey(),
  customer_id: model.text(),

  // Core body measurements (all numeric, stored in specified unit)
  bust: model.float().nullable(),
  waist: model.float().nullable(),
  hips: model.float().nullable(),
  shoulder: model.float().nullable(),
  length: model.float().nullable(),
  sleeve: model.float().nullable(),
  inseam: model.float().nullable(),

  // Unit: inches or centimeters
  unit: model.enum(["in", "cm"]).default("in"),

  // Source: manual entry or AI measurement (future integration)
  source: model.enum(["manual", "ai"]).default("manual"),

  // Owner reviews and confirms before use in stitching
  confirmed: model.boolean().default(false),

  // Free-text notes
  notes: model.text().nullable(),
});
