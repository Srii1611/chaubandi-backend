import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type {
  IEventBusModuleService,
  IOrderModuleService,
} from "@medusajs/framework/types";

/**
 * POST /store/inspiration
 * Submit a custom-design inspiration request.
 * Creates a draft order carrying the reference image URL and design
 * specs in metadata â€” the merchant reviews and prices it in admin.
 *
 * Body (JSON):
 *   - image_url: string (upload the file first, then send its URL)
 *   - garment_type: string (e.g., "Lehenga")
 *   - fabric?, color?, embroidery?, occasion?, budget?, notes?: string
 *
 * Requires authenticated customer.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const {
    image_url,
    garment_type,
    fabric,
    color,
    embroidery,
    occasion,
    budget,
    notes,
  } = req.body as {
    image_url: string;
    garment_type: string;
    fabric?: string;
    color?: string;
    embroidery?: string;
    occasion?: string;
    budget?: string;
    notes?: string;
  };

  if (!image_url || !garment_type) {
    return res
      .status(400)
      .json({ message: "image_url and garment_type are required" });
  }

  const metadata: Record<string, any> = {
    type: "inspiration_request",
    customer_id: customerId,
    image_url,
    garment_type,
    fabric: fabric || null,
    color: color || null,
    embroidery: embroidery || null,
    occasion: occasion || null,
    budget: budget || null,
    notes: notes || null,
  };

  try {
    // Draft order — merchant will review and add priced items later.
    // is_draft_order is only settable via update, so create then flag.
    const created = await orderService.createOrders({
      customer_id: customerId,
      currency_code: "usd",
      status: "draft" as any,
      items: [],
      metadata,
    });
    const draftOrder = await orderService.updateOrders(created.id, {
      is_draft_order: true,
    });

    // Module services don't auto-emit events â€” emit so the
    // inspiration-request subscriber can notify the owner.
    const eventBus: IEventBusModuleService = req.scope.resolve(
      Modules.EVENT_BUS
    );
    await eventBus.emit({ name: "draft_order.created", data: draftOrder }, {});

    res.status(201).json({
      draft_order: draftOrder,
      message:
        "Inspiration request submitted. We will review and get back to you with pricing.",
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create inspiration request",
      error: error.message,
    });
  }
}

/**
 * GET /store/inspiration
 * List the authenticated customer's inspiration requests.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const draftOrders = await orderService.listOrders(
      {
        customer_id: customerId,
      },
      { order: { created_at: "DESC" } }
    );

    // Metadata is jsonb â€” filter for inspiration requests in JS
    const inspirationRequests = draftOrders.filter(
      (o: any) => o.metadata?.type === "inspiration_request"
    );

    res.json({ inspiration_requests: inspirationRequests });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch inspiration requests",
      error: error.message,
    });
  }
}
