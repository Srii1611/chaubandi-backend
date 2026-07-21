import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ProductReviewService from "../../../../../modules/product-reviews/service";
import { PRODUCT_REVIEWS_MODULE } from "../../../../../modules/product-reviews";

/**
 * POST /admin/reviews/:id/status
 * Approve or reject a submitted review. Approving is what makes it public.
 * Body: { status: "approved" | "rejected" }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reviewService: ProductReviewService = req.scope.resolve(
    PRODUCT_REVIEWS_MODULE
  );

  const { status } = (req.body || {}) as { status?: string };
  if (status !== "approved" && status !== "rejected") {
    return res
      .status(400)
      .json({ message: "status must be 'approved' or 'rejected'" });
  }

  const [existing] = await reviewService.listProductReviews({
    id: req.params.id,
  });
  if (!existing) {
    return res.status(404).json({ message: "Review not found" });
  }

  const review =
    status === "approved"
      ? await reviewService.approve(req.params.id)
      : await reviewService.reject(req.params.id);

  res.json({ review });
}
