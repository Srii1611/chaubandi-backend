import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import AppointmentService from "../../../../modules/appointments/service";
import { APPOINTMENTS_MODULE } from "../../../../modules/appointments";

/**
 * GET /store/appointments/availability?month=YYYY-MM
 * Public. Calendar-level view: which days in the month can be booked at all,
 * and how many slots remain on each. The storefront uses this to grey out
 * dates before the customer picks one, then calls /slots for the times.
 *
 * Response:
 *   {
 *     month: "2026-08",
 *     timezone: "America/New_York",
 *     days: [{ date, available, slots_total, slots_available }]
 *   }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentService = req.scope.resolve(
    APPOINTMENTS_MODULE
  );

  const monthParam =
    (req.query.month as string) || new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
    return res
      .status(400)
      .json({ message: "month must be in YYYY-MM format" });
  }

  const [year, month] = monthParam.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth));

  // Never offer a date in the past, even for the current month.
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const from = monthStart > todayUtc ? monthStart : todayUtc;

  // getAvailableSlots walks forward in whole weeks; ask for enough to cover
  // the rest of the month.
  const weeks = Math.ceil(
    (monthEnd.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const slots =
    from > monthEnd
      ? []
      : await appointmentService.getAvailableSlots(from, Math.max(weeks, 1));

  const byDate = new Map<string, { total: number; available: number }>();
  for (const slot of slots) {
    if (!slot.date.startsWith(monthParam)) continue;
    const entry = byDate.get(slot.date) || { total: 0, available: 0 };
    entry.total++;
    if (slot.available) entry.available++;
    byDate.set(slot.date, entry);
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${monthParam}-${String(i + 1).padStart(2, "0")}`;
    const entry = byDate.get(date);
    return {
      date,
      available: !!entry && entry.available > 0,
      slots_total: entry?.total ?? 0,
      slots_available: entry?.available ?? 0,
    };
  });

  res.json({
    month: monthParam,
    timezone: process.env.APPOINTMENT_TZ || "America/New_York",
    days,
  });
}
