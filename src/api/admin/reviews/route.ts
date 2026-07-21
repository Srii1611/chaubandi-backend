import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ProductReviewService from "../../../modules/product-reviews/service";
import { PRODUCT_REVIEWS_MODULE } from "../../../modules/product-reviews";

/**
 * GET /admin/reviews
 * Moderation queue. Defaults to pending reviews (what needs action).
 * Query params: status (pending|approved|rejected|all), product_id, limit, offset
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: ProductReviewService = req.scope.resolve(
    PRODUCT_REVIEWS_MODULE
  );

  const status = (req.query.status as string) || "pending";
  const filters: Record<string, any> = {};
  if (status !== "all") {
    filters.status = status;
  }
  if (req.query.product_id) {
    filters.product_id = req.query.product_id;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset
    ? parseInt(req.query.offset as string, 10)
    : 0;

  const [reviews, count] = await reviewService.listAndCountProductReviews(
    filters,
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  );

  res.json({ reviews, count, limit, offset });
}
