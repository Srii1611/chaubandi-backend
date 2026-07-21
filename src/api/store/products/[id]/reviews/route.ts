import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import ProductReviewService from "../../../../../modules/product-reviews/service";
import { PRODUCT_REVIEWS_MODULE } from "../../../../../modules/product-reviews";

/**
 * GET /store/products/:id/reviews
 * Public. Returns approved reviews only, newest first.
 * Response: { reviews: [], count: number, average: number | null }
 *
 * A product with no approved reviews returns an empty list with
 * `average: null` — the storefront renders "no reviews yet" rather than a
 * fabricated rating.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: ProductReviewService = req.scope.resolve(
    PRODUCT_REVIEWS_MODULE
  );

  const productId = req.params.id;
  const summary = await reviewService.getApprovedForProduct(productId);

  res.json(summary);
}

/**
 * POST /store/products/:id/reviews
 * Public. Submits a review — always stored as `pending` until the owner
 * approves it in admin.
 *
 * Body: { customer_name, rating (1-5), title?, body }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const reviewService: ProductReviewService = req.scope.resolve(
    PRODUCT_REVIEWS_MODULE
  );

  const productId = req.params.id;

  // Reject reviews for products that don't exist, so the moderation queue
  // can't be filled with orphans.
  const productModuleService = req.scope.resolve(Modules.PRODUCT);
  const [product] = await productModuleService.listProducts({ id: productId });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const { customer_name, rating, title, body } = (req.body || {}) as {
    customer_name?: string;
    rating?: number;
    title?: string;
    body?: string;
  };

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ message: "customer_name is required" });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ message: "body is required" });
  }
  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return res
      .status(400)
      .json({ message: "rating must be an integer between 1 and 5" });
  }

  const review = await reviewService.submit({
    product_id: productId,
    // A logged-in customer is linked when we have one; guests are allowed.
    customer_id: req.auth_context?.actor_id ?? null,
    customer_name: customer_name.trim().slice(0, 120),
    rating,
    title: title?.trim().slice(0, 160) || null,
    body: body.trim().slice(0, 4000),
  });

  res.status(201).json({
    review,
    message: "Thank you — your review will appear once it has been approved.",
  });
}
