import { MedusaService } from "@medusajs/framework/utils";
import { AppointmentModel } from "./models/appointment";
import { CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentDTO, AvailableSlotDTO } from "./types";

/**
 * Appointment Service
 * Handles CRUD for appointments and available slot calculation.
 */
class AppointmentService extends MedusaService({
  Appointment: AppointmentModel,
}) {
  /**
   * Generate available time slots for booking.
   * Defaults to Friday-only, configurable via env vars.
   */
  async getAvailableSlots(
    startDate: Date = new Date(),
    weeksAhead: number = 4
  ): Promise<AvailableSlotDTO[]> {
    const availableDays = process.env.APPOINTMENT_AVAILABLE_DAYS
      ? process.env.APPOINTMENT_AVAILABLE_DAYS.split(",").map(Number)
      : [5]; // Default: Friday only (0=Sun, 5=Fri)
    const startHour = parseInt(process.env.APPOINTMENT_START_HOUR || "10", 10);
    const endHour = parseInt(process.env.APPOINTMENT_END_HOUR || "18", 10);
    const slotMinutes = parseInt(process.env.APPOINTMENT_SLOT_MINUTES || "30", 10);

    const slots: AvailableSlotDTO[] = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeksAhead * 7);

    // Get all existing appointments in range to mark booked slots
    const existingAppointments = await this.listAppointments({
      requested_date: {
        $gte: startDate,
        $lte: endDate,
      },
      status: {
        $in: ["requested", "confirmed"],
      },
    });

    const bookedSlots = new Set(
      existingAppointments.map(
        (a: any) => `${a.requested_date.toISOString().split("T")[0]}_${a.time_slot}`
      )
    );

    // Generate slots
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (!availableDays.includes(d.getDay())) continue;

      const dateStr = d.toISOString().split("T")[0];

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min = 0; min < 60; min += slotMinutes) {
          const timeSlot = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
          const slotKey = `${dateStr}_${timeSlot}`;

          slots.push({
            date: dateStr,
            time_slot: timeSlot,
            available: !bookedSlots.has(slotKey),
          });
        }
      }
    }

    return slots;
  }

  /**
   * Create a booking request.
   */
  async createBooking(data: CreateAppointmentDTO): Promise<AppointmentDTO> {
    // Generated create/update methods return a single object for single
    // input (an array only for array input).
    const appointment = await this.createAppointments({
      customer_id: data.customer_id,
      requested_date: new Date(data.requested_date),
      time_slot: data.time_slot,
      status: "requested",
      fee_paid: false,
      notes: data.notes || null,
    });

    return appointment as unknown as AppointmentDTO;
  }

  /**
   * Confirm a booking (admin action).
   */
  async confirmAppointment(id: string): Promise<AppointmentDTO> {
    const appointment = await this.updateAppointments({
      id,
      status: "confirmed",
    });
    return appointment as unknown as AppointmentDTO;
  }

  /**
   * Cancel a booking.
   */
  async cancelAppointment(id: string): Promise<AppointmentDTO> {
    const appointment = await this.updateAppointments({
      id,
      status: "cancelled",
    });
    return appointment as unknown as AppointmentDTO;
  }

  /**
   * Mark fee as paid after Stripe capture.
   */
  async markFeePaid(id: string, paymentIntentId: string): Promise<AppointmentDTO> {
    const appointment = await this.updateAppointments({
      id,
      fee_paid: true,
      stripe_payment_intent_id: paymentIntentId,
    });
    return appointment as unknown as AppointmentDTO;
  }

  /**
   * List appointments for a customer.
   */
  async listByCustomer(customerId: string): Promise<AppointmentDTO[]> {
    return this.listAppointments(
      { customer_id: customerId },
      { order: { requested_date: "ASC" } }
    ) as Promise<AppointmentDTO[]>;
  }
}

export default AppointmentService;
