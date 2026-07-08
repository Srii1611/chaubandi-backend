import { MedusaService } from "@medusajs/framework/utils";
import { MeasurementModel } from "./models/measurement";
import { CreateMeasurementDTO, UpdateMeasurementDTO, MeasurementDTO } from "./types";

/**
 * Measurement Service
 * CRUD for per-customer body measurements.
 * Customers manage their own; admin confirms for stitching.
 */
class MeasurementService extends MedusaService({
  Measurement: MeasurementModel,
}) {
  /**
   * Create or update measurements for a customer.
   * If measurements already exist, updates them.
   */
  async upsertForCustomer(
    customerId: string,
    data: Omit<CreateMeasurementDTO, "customer_id">
  ): Promise<MeasurementDTO> {
    const existing = await this.listMeasurements(
      { customer_id: customerId },
      { take: 1 }
    );

    // Generated create/update methods return a single object for single
    // input (an array only for array input).
    if (existing.length > 0) {
      // Update existing
      const updated = await this.updateMeasurements({
        id: existing[0].id,
        bust: data.bust ?? existing[0].bust,
        waist: data.waist ?? existing[0].waist,
        hips: data.hips ?? existing[0].hips,
        shoulder: data.shoulder ?? existing[0].shoulder,
        length: data.length ?? existing[0].length,
        sleeve: data.sleeve ?? existing[0].sleeve,
        inseam: data.inseam ?? existing[0].inseam,
        unit: data.unit || existing[0].unit,
        source: data.source || existing[0].source,
        notes: data.notes !== undefined ? data.notes : existing[0].notes,
        confirmed: false, // Reset confirmation on update
      });
      return updated as unknown as MeasurementDTO;
    }

    // Create new
    const created = await this.createMeasurements({
      customer_id: customerId,
      bust: data.bust ?? null,
      waist: data.waist ?? null,
      hips: data.hips ?? null,
      shoulder: data.shoulder ?? null,
      length: data.length ?? null,
      sleeve: data.sleeve ?? null,
      inseam: data.inseam ?? null,
      unit: data.unit || "in",
      source: data.source || "manual",
      confirmed: false,
      notes: data.notes || null,
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
