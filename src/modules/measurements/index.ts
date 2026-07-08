import { Module } from "@medusajs/framework/utils";
import MeasurementService from "./service";

/**
 * Measurements Module
 * Per-customer body measurements for made-to-fit ethnic wear.
 * Supports manual entry now; AI integration via `source: "ai"` later.
 */
export const MEASUREMENTS_MODULE = "measurements";

export default Module(MEASUREMENTS_MODULE, {
  service: MeasurementService,
});
