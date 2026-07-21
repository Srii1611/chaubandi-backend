import { model } from "@medusajs/framework/utils";

/**
 * Product Review Model
 * Customer-submitted reviews for a single product.
 *
 * Reviews are created as `pending` and only surface on the storefront once
 * the owner approves them in admin — no review is ever published unread, and
 * none are seeded (zero fabricated social proof).
 */
export const ProductReviewModel = model.define("product_review", {
  id: model.id({ prefix: "prev" }).primaryKey(),
  product_id: model.text(),
  // Denormalised: reviewers may be guests, so we store the display name
  // rather than joining a customer record.
  customer_name: model.text(),
  customer_id: model.text().nullable(),
  rating: model.number(),
  title: model.text().nullable(),
  body: model.text(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
});
