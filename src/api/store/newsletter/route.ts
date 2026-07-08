import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/newsletter
 * Public route — captures a newsletter signup. Notifies the owner of the new
 * subscriber and sends the subscriber a welcome email (10% off first order).
 * Uses the configured NOTIFICATION provider; degrades quietly if none is set.
 *
 * Body: { email: string }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email } = (req.body || {}) as { email?: string };

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  const notificationService = req.scope.resolve(Modules.NOTIFICATION);
  const ownerEmail = process.env.OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;

  // Notify the owner that someone subscribed
  if (ownerEmail) {
    try {
      await notificationService.createNotifications({
        to: ownerEmail,
        channel: "email",
        template: process.env.SENDGRID_TEMPLATE_NEWSLETTER_ADMIN || "newsletter-signup",
        data: {
          subject: `New newsletter subscriber: ${email}`,
          email,
          text: `New newsletter subscriber: ${email}`,
          html: `<p>New newsletter subscriber: <strong>${email}</strong></p>`,
        },
      });
    } catch (error: any) {
      console.error("[newsletter] Owner notification failed:", error.message);
    }
  }

  // Welcome the subscriber
  try {
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: process.env.SENDGRID_TEMPLATE_NEWSLETTER_WELCOME || "newsletter-welcome",
      data: {
        subject: "Welcome to Chaubandi — 10% off your first order",
        email,
        code: "WELCOME10",
        html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1208;">
  <div style="background:#1f1812;padding:26px;text-align:center;color:#e8c97a;font-size:22px;letter-spacing:2px;">CHAUBANDI</div>
  <div style="padding:26px;">
    <h2 style="font-weight:400;">Welcome to the family.</h2>
    <p style="color:#555;line-height:1.6;">Thank you for joining us. Here's <strong>10% off</strong> your first order — use code <strong>WELCOME10</strong> at checkout.</p>
    <p style="color:#555;line-height:1.6;">You'll be first to hear about new arrivals, bridal drops, and special offers.</p>
  </div>
  <div style="background:#faf7f0;padding:16px;text-align:center;color:#888;font-size:12px;">177 Massachusetts Avenue, Arlington, MA 02474</div>
</div>`,
        text: "Welcome to Chaubandi! Here's 10% off your first order — use code WELCOME10 at checkout.",
      },
    });
  } catch (error: any) {
    console.error("[newsletter] Welcome email failed:", error.message);
  }

  res.status(201).json({ success: true });
}
