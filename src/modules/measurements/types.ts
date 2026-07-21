/**
 * Measurements Module Types
 *
 * Field set mirrors the Lashkaraa custom-stitching form. Numeric fields are
 * expressed in the row's `unit`.
 */

export type MeasurementUnit = "in" | "cm";
export type MeasurementSource = "manual" | "ai";

/** Every numeric measurement field, in form order. */
export const MEASUREMENT_NUMERIC_FIELDS = [
  "height",
  // Upper
  "bust",
  "above_waist",
  "waist",
  "hips",
  "shoulder_width",
  "armhole",
  "bicep",
  "sleeve_length",
  "front_neck_depth",
  "back_neck_depth",
  "top_length",
  // Lower
  "bottom_length_skirt",
  "bottom_length_pant",
  "thigh",
  "knee",
  "ankle",
] as const;

export type MeasurementNumericField =
  (typeof MEASUREMENT_NUMERIC_FIELDS)[number];

export type MeasurementValues = {
  [K in MeasurementNumericField]?: number | null;
};

export interface CreateMeasurementDTO extends MeasurementValues {
  customer_id: string;
  unit?: MeasurementUnit;
  sleeve_style?: string | null;
  source?: MeasurementSource;
  notes?: string | null;
}

export interface UpdateMeasurementDTO extends MeasurementValues {
  unit?: MeasurementUnit;
  sleeve_style?: string | null;
  source?: MeasurementSource;
  confirmed?: boolean;
  notes?: string | null;
}

export type MeasurementDTO = {
  [K in MeasurementNumericField]: number | null;
} & {
  id: string;
  customer_id: string;
  unit: MeasurementUnit;
  sleeve_style: string | null;
  source: MeasurementSource;
  confirmed: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};
