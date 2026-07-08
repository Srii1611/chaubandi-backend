import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

/**
 * Subscriber: appointment.created
 * Emails the owner (Sushma) when a new appointment booking comes in.
 */
export default async function appointmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<any>) {
  const notificationService = container.resolve(Modules.NOTIFICATION);

  const { data: appointment } = event;

  const ownerEmail = process.env.OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;
  if (!ownerEmail) {
    console.warn("[appointment.created] No OWNER_EMAIL configured, skipping notification");
    return;
  }

  try {
    await notificationService.createNotifications({
      to: ownerEmail,
      channel: "email",
      template: "appointment-booking-notification",
      data: {
        subject: `New Appointment Booking — ${appointment.time_slot}`,
        appointment_id: appointment.id,
        customer_id: appointment.customer_id,
        requested_date: appointment.requested_date,
        time_slot: appointment.time_slot,
        status: appointment.status,
        notes: appointment.notes || "No notes",
        // SendGrid template data
        text: `New appointment booking received:\n\nDate: ${appointment.requested_date}\nTime: ${appointment.time_slot}\nCustomer: ${appointment.customer_id}\nNotes: ${appointment.notes || "None"}\n\nLog in to the admin dashboard to confirm or cancel.`,
        html: `<h2>New Appointment Booking</h2>
<p><strong>Date:</strong> ${appointment.requested_date}</p>
<p><strong>Time:</strong> ${appointment.time_slot}</p>
<p><strong>Customer:</strong> ${appointment.customer_id}</p>
<p><strong>Notes:</strong> ${appointment.notes || "None"}</p>
<p><a href="http://localhost:9000/app">Open Admin Dashboard</a></p>`,
      },
    });

    console.log(`[appointment.created] Notification sent to ${ownerEmail}`);
  } catch (error: any) {
    console.error("[appointment.created] Failed to send notification:", error.message);
  }
}

export const config: SubscriberConfig = {
  event: "appointment.created",
};
