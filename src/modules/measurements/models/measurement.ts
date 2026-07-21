import { model } from "@medusajs/framework/utils";

/**
 * Measurement Model
 * Per-customer body measurements for made-to-fit garments.
 *
 * Field set mirrors the Lashkaraa custom-stitching form so a customer can
 * transfer numbers 1:1 from any measurement chart they already have.
 * All numeric values are expressed in the row's `unit` (inches or cm).
 */
export const MeasurementModel = model.define("measurement", {
  id: model.id({ prefix: "meas" }).primaryKey(),
  customer_id: model.text(),

  // Unit for every numeric field on the row
  unit: model.enum(["in", "cm"]).default("in"),
  height: model.float().nullable(),

  // ─── Upper body ───
  bust: model.float().nullable(),
  above_waist: model.float().nullable(),
  waist: model.float().nullable(),
  hips: model.float().nullable(),
  shoulder_width: model.float().nullable(),
  armhole: model.float().nullable(),
  bicep: model.float().nullable(),
  sleeve_length: model.float().nullable(),
  // Free text (e.g. "Cap", "3/4", "Full") — a style choice, not a measurement
  sleeve_style: model.text().nullable(),
  front_neck_depth: model.float().nullable(),
  back_neck_depth: model.float().nullable(),
  top_length: model.float().nullable(),

  // ─── Lower body ───
  bottom_length_skirt: model.float().nullable(),
  bottom_length_pant: model.float().nullable(),
  thigh: model.float().nullable(),
  knee: model.float().nullable(),
  ankle: model.float().nullable(),

  // Free-text notes from the customer
  notes: model.text().nullable(),

  // Source: manual entry or AI measurement (future integration)
  source: model.enum(["manual", "ai"]).default("manual"),

  // Owner reviews and confirms before use in stitching
  confirmed: model.boolean().default(false),
});
