import { Module } from "@medusajs/framework/utils";
import ProductReviewService from "./service";

/**
 * Product Reviews Module
 * Per-product customer reviews with an approval gate.
 */
export const PRODUCT_REVIEWS_MODULE = "product_reviews";

export default Module(PRODUCT_REVIEWS_MODULE, {
  service: ProductReviewService,
});
