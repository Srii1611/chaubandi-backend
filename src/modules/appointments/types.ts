/**
 * Appointment Module Types
 */

export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

export interface CreateAppointmentDTO {
  customer_id: string;
  requested_date: Date | string;
  time_slot: string;
  notes?: string | null;
}

export interface UpdateAppointmentDTO {
  status?: AppointmentStatus;
  fee_paid?: boolean;
  stripe_payment_intent_id?: string;
  notes?: string | null;
}

export interface AppointmentDTO {
  id: string;
  customer_id: string;
  requested_date: Date;
  time_slot: string;
  status: AppointmentStatus;
  fee_paid: boolean;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AvailableSlotDTO {
  date: string;
  time_slot: string;
  available: boolean;
}
