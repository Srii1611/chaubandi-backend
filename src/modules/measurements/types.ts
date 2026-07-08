/**
 * Measurements Module Types
 */

export type MeasurementUnit = "in" | "cm";
export type MeasurementSource = "manual" | "ai";

export interface CreateMeasurementDTO {
  customer_id: string;
  bust?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulder?: number | null;
  length?: number | null;
  sleeve?: number | null;
  inseam?: number | null;
  unit?: MeasurementUnit;
  source?: MeasurementSource;
  notes?: string | null;
}

export interface UpdateMeasurementDTO {
  bust?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulder?: number | null;
  length?: number | null;
  sleeve?: number | null;
  inseam?: number | null;
  unit?: MeasurementUnit;
  source?: MeasurementSource;
  confirmed?: boolean;
  notes?: string | null;
}

export interface MeasurementDTO {
  id: string;
  customer_id: string;
  bust: number | null;
  waist: number | null;
  hips: number | null;
  shoulder: number | null;
  length: number | null;
  sleeve: number | null;
  inseam: number | null;
  unit: MeasurementUnit;
  source: MeasurementSource;
  confirmed: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
