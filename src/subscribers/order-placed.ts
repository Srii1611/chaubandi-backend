import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

/**
 * Subscriber: order.placed
 * Sends the customer an order confirmation (receipt) and a copy to the owner
 * (Sushma). Uses the configured NOTIFICATION provider (SendGrid by default) —
 * nothing sends until a real API key + verified sender are set in .env.
 *
 * Template IDs are read from env so the merchant can point them at real
 * SendGrid dynamic templates; the inline `html`/`text` are used as-is by
 * raw-HTML providers (e.g. Resend) and as a fallback.
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const notificationService = container.resolve(Modules.NOTIFICATION);
  const orderService = container.resolve(Modules.ORDER);

  let order: any;
  try {
    order = await orderService.retrieveOrder(event.data.id, {
      relations: ["items", "shipping_address"],
    });
  } catch (error: any) {
    console.error(`[order.placed] Could not load order ${event.data.id}:`, error.message);
    return;
  }

  const currency = (order.currency_code || "usd").toUpperCase();
  const sign = currency === "USD" ? "$" : "";
  const money = (amount: number) => `${sign}${Number(amount || 0).toFixed(2)}`;

  const items = (order.items || []).map((i: any) => {
    const lineTotal = typeof i.total === "number" ? i.total : (i.unit_price || 0) * (i.quantity || 0);
    return {
      title: i.product_title || i.title,
      variant: i.variant_title || "",
      quantity: i.quantity,
      line_total: money(lineTotal),
      _raw: lineTotal,
    };
  });

  const subtotal = items.reduce((s, i) => s + i._raw, 0);
  const grandTotal = typeof order.total === "number" ? order.total : subtotal;
  const orderNo = `CB-${order.display_id}`;
  const name = order.shipping_address?.first_name || "there";

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${i.title}${i.variant ? ` — ${i.variant}` : ""} &times; ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${i.line_total}</td></tr>`
    )
    .join("");

  const itemsText = items.map((i) => `- ${i.title}${i.variant ? ` (${i.variant})` : ""} x${i.quantity} — ${i.line_total}`).join("\n");

  const customerHtml = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1208;">
    <div style="background:#1f1812;padding:28px 24px;text-align:center;">
      <div style="color:#e8c97a;font-size:22px;letter-spacing:2px;">CHAUBANDI</div>
      <div style="color:#a3947c;font-size:12px;letter-spacing:1px;margin-top:4px;">Knots of Tradition</div>
    </div>
    <div style="padding:28px 24px;">
      <h2 style="font-weight:400;">Thank you, ${name}! Your order is confirmed.</h2>
      <p style="color:#555;">Order <strong>${orderNo}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}
        <tr><td style="padding:12px 0;font-weight:bold;">Total</td><td style="padding:12px 0;text-align:right;font-weight:bold;">${money(grandTotal)}</td></tr>
      </table>
      <p style="color:#555;line-height:1.6;">We'll prepare and ship your order within 24&ndash;48 hours and email you tracking details. Every purchase includes free alterations — reply to this email or message us on WhatsApp at +1 (857) 800-1282 if anything needs adjusting.</p>
    </div>
    <div style="background:#faf7f0;padding:18px 24px;text-align:center;color:#888;font-size:12px;">177 Massachusetts Avenue, Arlington, MA 02474</div>
  </div>`;

  const customerText = `Thank you, ${name}! Your Chaubandi order ${orderNo} is confirmed.\n\n${itemsText}\n\nTotal: ${money(grandTotal)}\n\nWe'll ship within 24-48 hours and email tracking details. Free alterations included — reply here or WhatsApp +1 (857) 800-1282.`;

  // 1) Receipt to the customer
  if (order.email) {
    try {
      await notificationService.createNotifications({
        to: order.email,
        channel: "email",
        template: process.env.SENDGRID_TEMPLATE_ORDER_CONFIRMATION || "order-confirmation",
        data: {
          subject: `Your Chaubandi order ${orderNo} is confirmed`,
          order_no: orderNo,
          customer_name: name,
          total: money(grandTotal),
          items,
          html: customerHtml,
          text: customerText,
        },
      });
      console.log(`[order.placed] Confirmation sent to ${order.email} for ${orderNo}`);
    } catch (error: any) {
      console.error(`[order.placed] Customer email failed for ${orderNo}:`, error.message);
    }
  }

  // 2) Copy to the owner (Sushma)
  const ownerEmail = process.env.OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;
  if (ownerEmail) {
    try {
      await notificationService.createNotifications({
        to: ownerEmail,
        channel: "email",
        template: process.env.SENDGRID_TEMPLATE_ORDER_ADMIN || process.env.SENDGRID_TEMPLATE_ORDER_CONFIRMATION || "order-confirmation",
        data: {
          subject: `New order ${orderNo} — ${money(grandTotal)}`,
          order_no: orderNo,
          total: money(grandTotal),
          items,
          html: `<p><strong>New order ${orderNo}</strong> — ${money(grandTotal)}</p><p>${order.email || ""}</p>${customerHtml}`,
          text: `New order ${orderNo} — ${money(grandTotal)} (${order.email || "no email"})\n\n${customerText}`,
        },
      });
      console.log(`[order.placed] Owner copy sent to ${ownerEmail} for ${orderNo}`);
    } catch (error: any) {
      console.error(`[order.placed] Owner email failed for ${orderNo}:`, error.message);
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
