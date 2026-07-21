import { MedusaService } from "@medusajs/framework/utils";
import { ProductReviewModel } from "./models/product-review";
import {
  CreateProductReviewDTO,
  ProductReviewDTO,
  ProductReviewSummary,
} from "./types";

/**
 * Product Review Service
 * Storefront reads approved reviews only; submissions land as `pending`.
 */
class ProductReviewService extends MedusaService({
  ProductReview: ProductReviewModel,
}) {
  /**
   * Approved reviews for a product, newest first, with count and average.
   */
  async getApprovedForProduct(
    productId: string
  ): Promise<ProductReviewSummary> {
    const reviews = (await this.listProductReviews(
      { product_id: productId, status: "approved" },
      { order: { created_at: "DESC" } }
    )) as unknown as ProductReviewDTO[];

    const count = reviews.length;
    const average =
      count === 0
        ? null
        : Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10
          ) / 10;

    return { reviews, count, average };
  }

  /**
   * Submit a review. Always created as `pending` — approval is a
   * deliberate admin action.
   */
  async submit(data: CreateProductReviewDTO): Promise<ProductReviewDTO> {
    // Generated create methods return a single object for single input.
    const review = await this.createProductReviews({
      product_id: data.product_id,
      customer_name: data.customer_name,
      customer_id: data.customer_id ?? null,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body,
      status: "pending",
    });
    return review as unknown as ProductReviewDTO;
  }

  async approve(id: string): Promise<ProductReviewDTO> {
    const review = await this.updateProductReviews({
      id,
      status: "approved",
    });
    return review as unknown as ProductReviewDTO;
  }

  async reject(id: string): Promise<ProductReviewDTO> {
    const review = await this.updateProductReviews({
      id,
      status: "rejected",
    });
    return review as unknown as ProductReviewDTO;
  }
}

export default ProductReviewService;
