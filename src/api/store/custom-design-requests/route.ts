import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type {
  IEventBusModuleService,
  IOrderModuleService,
} from "@medusajs/framework/types";

/**
 * POST /store/custom-design-requests
 * Public. Submit a custom-design ("Design Your Dream Outfit") request.
 *
 * Creates a draft order carrying every field in metadata — the owner reviews
 * and prices it in admin — then emits `draft_order.created` so the notification
 * subscriber emails Sushma. Guests are welcome: a logged-in customer is linked
 * when there is one, otherwise the request is keyed by the supplied email.
 *
 * Body (JSON):
 *   name, email                (required)
 *   garment_type               (required)
 *   phone, occasion, event_date, budget_range, notes  (optional)
 *   image_urls: string[]       (optional — upload via POST /store/uploads first)
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

  const {
    name,
    email,
    phone,
    garment_type,
    occasion,
    event_date,
    budget_range,
    notes,
    image_urls,
  } = (req.body || {}) as Record<string, any>;

  if (!name || !email || !garment_type) {
    return res.status(400).json({
      message: "name, email and garment_type are required",
    });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  const images = Array.isArray(image_urls)
    ? image_urls.filter((u) => typeof u === "string").slice(0, 5)
    : [];

  if (event_date && isNaN(new Date(event_date).getTime())) {
    return res.status(400).json({ message: "Invalid event_date" });
  }

  const customerId = req.auth_context?.actor_id ?? null;

  const metadata: Record<string, any> = {
    type: "custom_design_request",
    name,
    email,
    phone: phone || null,
    garment_type,
    occasion: occasion || null,
    event_date: event_date || null,
    budget_range: budget_range || null,
    notes: notes || null,
    image_urls: images,
    // Kept for the legacy /store/inspiration consumers, which read a single URL.
    image_url: images[0] || null,
    customer_id: customerId,
  };

  try {
    // is_draft_order is only settable via update, so create then flag.
    const created = await orderService.createOrders({
      ...(customerId ? { customer_id: customerId } : {}),
      email,
      currency_code: "usd",
      status: "draft" as any,
      items: [],
      metadata,
    });
    const draftOrder = await orderService.updateOrders(created.id, {
      is_draft_order: true,
    });

    // Module services don't auto-emit events — emit so the notification
    // subscriber can alert the owner.
    const eventBus: IEventBusModuleService = req.scope.resolve(
      Modules.EVENT_BUS
    );
    await eventBus.emit({ name: "draft_order.created", data: draftOrder }, {});

    res.status(201).json({
      draft_order: draftOrder,
      message:
        "Thank you — your custom design request has been received. Chaubandi will be in touch with a quote.",
    });
  } catch (error: any) {
    console.error("[custom-design-requests] Failed:", error);
    res.status(500).json({
      message: "Failed to create custom design request",
      error: error.message,
    });
  }
}
