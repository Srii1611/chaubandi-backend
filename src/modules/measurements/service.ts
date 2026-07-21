import { MedusaService } from "@medusajs/framework/utils";
import { MeasurementModel } from "./models/measurement";
import {
  CreateMeasurementDTO,
  MeasurementDTO,
  MEASUREMENT_NUMERIC_FIELDS,
} from "./types";

/**
 * Measurement Service
 * CRUD for per-customer body measurements.
 * Customers manage their own; the owner confirms them before stitching.
 */
class MeasurementService extends MedusaService({
  Measurement: MeasurementModel,
}) {
  /**
   * Create or update the measurements for a customer. One row per customer:
   * fields omitted from `data` keep their stored value, so the storefront can
   * PATCH a single number without resending the whole chart.
   */
  async upsertForCustomer(
    customerId: string,
    data: Omit<CreateMeasurementDTO, "customer_id">
  ): Promise<MeasurementDTO> {
    const existing = await this.listMeasurements(
      { customer_id: customerId },
      { take: 1 }
    );
    const current = existing[0] as any;

    const values: Record<string, any> = {};
    for (const field of MEASUREMENT_NUMERIC_FIELDS) {
      const incoming = (data as any)[field];
      values[field] =
        incoming !== undefined ? incoming : current ? current[field] : null;
    }
    values.sleeve_style =
      data.sleeve_style !== undefined
        ? data.sleeve_style
        : current
        ? current.sleeve_style
        : null;
    values.unit = data.unit || current?.unit || "in";
    values.source = data.source || current?.source || "manual";
    values.notes =
      data.notes !== undefined ? data.notes : current ? current.notes : null;
    // Any edit invalidates the owner's confirmation.
    values.confirmed = false;

    // Generated create/update methods return a single object for single
    // input (an array only for array input).
    if (current) {
      const updated = await this.updateMeasurements({
        id: current.id,
        ...values,
      });
      return updated as unknown as MeasurementDTO;
    }

    const created = await this.createMeasurements({
      customer_id: customerId,
      ...values,
    });
    return created as unknown as MeasurementDTO;
  }

  /**
   * Get measurements for a specific customer.
   */
  async getByCustomer(customerId: string): Promise<MeasurementDTO | null> {
    const results = await this.listMeasurements(
      { customer_id: customerId },
      { take: 1 }
    );
    return (results[0] as MeasurementDTO) || null;
  }

  /**
   * Admin: confirm measurements for stitching.
   */
  async confirm(id: string): Promise<MeasurementDTO> {
    const updated = await this.updateMeasurements({
      id,
      confirmed: true,
    });
    return updated as unknown as MeasurementDTO;
  }

  /**
   * List all measurements (admin use).
   */
  async listAll(query: Record<string, any> = {}): Promise<MeasurementDTO[]> {
    return this.listMeasurements(query) as Promise<MeasurementDTO[]>;
  }
}

export default MeasurementService;
