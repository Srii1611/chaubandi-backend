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

  // Only notify for custom-design work — both the legacy /store/inspiration
  // shape and the newer /store/custom-design-requests shape.
  const requestTypes = ["inspiration_request", "custom_design_request"];
  if (!requestTypes.includes(draftOrder.metadata?.type)) {
    return;
  }

  const ownerEmail = process.env.OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;
  if (!ownerEmail) {
    console.warn("[draft_order.created] No OWNER_EMAIL configured, skipping notification");
    return;
  }

  const meta = draftOrder.metadata;

  // The two request shapes carry overlapping-but-different fields; render
  // whatever is present rather than a fixed list full of "Not specified".
  const images: string[] = Array.isArray(meta.image_urls)
    ? meta.image_urls
    : meta.image_url
    ? [meta.image_url]
    : [];

  const rows: [string, string | null][] = [
    ["Name", meta.name],
    ["Email", meta.email],
    ["Phone", meta.phone],
    ["Garment Type", meta.garment_type],
    ["Fabric", meta.fabric],
    ["Color", meta.color],
    ["Embroidery", meta.embroidery],
    ["Occasion", meta.occasion],
    ["Event Date", meta.event_date],
    ["Budget", meta.budget_range || meta.budget],
    ["Notes", meta.notes],
  ];
  const present = rows.filter(([, value]) => value);

  const adminUrl = `${
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  }/app`;

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
        occasion: meta.occasion || "Not specified",
        notes: meta.notes || "None",
        image_urls: images,
        image_url: images[0] || null,
        text: [
          "New custom design request received:",
          "",
          ...present.map(([label, value]) => `${label}: ${value}`),
          "",
          ...(images.length
            ? [`Reference images:`, ...images]
            : ["No reference images attached."]),
          "",
          "Log in to the admin dashboard to review and price.",
        ].join("\n"),
        html: `<h2>New Custom Design Request</h2>
${present
  .map(([label, value]) => `<p><strong>${label}:</strong> ${value}</p>`)
  .join("\n")}
<p><strong>Reference Images:</strong> ${
          images.length
            ? images
                .map(
                  (url, i) => `<a href="${url}">Image ${i + 1}</a>`
                )
                .join(" · ")
            : "None attached"
        }</p>
<p><a href="${adminUrl}">Open Admin Dashboard</a></p>`,
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
