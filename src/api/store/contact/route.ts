import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/contact
 * Public route — delivers a contact / custom-design message to the owner
 * (Sushma) by email. The storefront also opens WhatsApp for an instant ping;
 * this gives a durable record in the inbox. Degrades quietly if no
 * notification provider / OWNER_EMAIL is configured.
 *
 * Body: { name?, email, phone?, subject?, message, kind? }
 *   kind: "contact" | "custom_design" (free-form label for the subject line)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { name, email, phone, subject, message, kind } = (req.body || {}) as {
    name?: string;
    email?: string;
    phone?: string;
    subject?: string;
    message?: string;
    kind?: string;
  };

  if (!email || !message) {
    return res.status(400).json({ message: "email and message are required" });
  }

  const notificationService = req.scope.resolve(Modules.NOTIFICATION);
  const ownerEmail = process.env.OWNER_EMAIL || process.env.SENDGRID_FROM_EMAIL;

  if (!ownerEmail) {
    // Nothing configured to send to — acknowledge so the storefront's
    // WhatsApp fallback still gives the customer a success state.
    return res.status(200).json({ success: true, delivered: false });
  }

  const label = kind === "custom_design" ? "Custom Design Request" : "Contact Message";
  const safe = (v?: string) => (v || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  try {
    await notificationService.createNotifications({
      to: ownerEmail,
      channel: "email",
      template: process.env.SENDGRID_TEMPLATE_CONTACT || "contact-message",
      data: {
        subject: subject ? `${label}: ${subject}` : `${label} from ${name || email}`,
        name: name || "",
        email,
        phone: phone || "",
        message,
        reply_to: email,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#1a1208;">
  <h2 style="font-weight:400;">${label}</h2>
  <p><strong>Name:</strong> ${safe(name) || "—"}</p>
  <p><strong>Email:</strong> ${safe(email)}</p>
  ${phone ? `<p><strong>Phone:</strong> ${safe(phone)}</p>` : ""}
  ${subject ? `<p><strong>Topic:</strong> ${safe(subject)}</p>` : ""}
  <p><strong>Message:</strong></p>
  <p style="white-space:pre-wrap;color:#333;">${safe(message)}</p>
</div>`,
        text: `${label}\n\nName: ${name || "—"}\nEmail: ${email}\n${phone ? `Phone: ${phone}\n` : ""}${subject ? `Topic: ${subject}\n` : ""}\nMessage:\n${message}`,
      },
    });

    res.status(201).json({ success: true, delivered: true });
  } catch (error: any) {
    console.error("[contact] Failed to send message:", error.message);
    res.status(200).json({ success: true, delivered: false });
  }
}
