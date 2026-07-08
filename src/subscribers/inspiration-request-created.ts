import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

/**
 * Subscriber: draft_order.created
 * Emails the owner (Sushma) when a new inspiration request (draft order) comes in.
 * Only fires for draft orders with type === "inspiration_request".
 */
export default async function inspirationRequestHandler({
  event,
  container,
}: SubscriberArgs<any>) {
  const notificationService = container.resolve(Modules.NOTIFICATION);

  const { data: draftOrder } = event;

  // Only notify for inspiration requests
  if (draftOrder.metadata?.type !== "inspiration_request") {
    return;
  }

  const ownerEmail = process.env.OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;
  if (!ownerEmail) {
    console.warn("[draft_order.created] No OWNER_EMAIL configured, skipping notification");
    return;
  }

  const meta = draftOrder.metadata;

  try {
    await notificationService.createNotifications({
      to: ownerEmail,
      channel: "email",
      template: "inspiration-request-notification",
      data: {
        subject: `New Custom Design Request — ${meta.garment_type}`,
        draft_order_id: draftOrder.id,
        customer_id: meta.customer_id,
        garment_type: meta.garment_type,
        fabric: meta.fabric || "Not specified",
        color: meta.color || "Not specified",
        embroidery: meta.embroidery || "Not specified",
        occasion: meta.occasion || "Not specified",
        budget: meta.budget || "Not specified",
        notes: meta.notes || "None",
        image_url: meta.image_url,
        text: `New custom design request received:\n\nGarment: ${meta.garment_type}\nFabric: ${meta.fabric || "N/A"}\nColor: ${meta.color || "N/A"}\nOccasion: ${meta.occasion || "N/A"}\nBudget: ${meta.budget || "N/A"}\nNotes: ${meta.notes || "None"}\n\nView image: ${meta.image_url}\n\nLog in to the admin dashboard to review and price.`,
        html: `<h2>New Custom Design Request</h2>
<p><strong>Garment Type:</strong> ${meta.garment_type}</p>
<p><strong>Fabric:</strong> ${meta.fabric || "Not specified"}</p>
<p><strong>Color:</strong> ${meta.color || "Not specified"}</p>
<p><strong>Embroidery:</strong> ${meta.embroidery || "Not specified"}</p>
<p><strong>Occasion:</strong> ${meta.occasion || "Not specified"}</p>
<p><strong>Budget:</strong> ${meta.budget || "Not specified"}</p>
<p><strong>Notes:</strong> ${meta.notes || "None"}</p>
<p><strong>Reference Image:</strong> <a href="${meta.image_url}">View Image</a></p>
<p><a href="http://localhost:9000/app">Open Admin Dashboard</a></p>`,
      },
    });

    console.log(`[draft_order.created] Inspiration notification sent to ${ownerEmail}`);
  } catch (error: any) {
    console.error("[draft_order.created] Failed to send notification:", error.message);
  }
}

export const config: SubscriberConfig = {
  event: "draft_order.created",
};
