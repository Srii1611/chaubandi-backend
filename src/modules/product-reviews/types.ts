/**
 * Product Reviews Module Types
 */

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface CreateProductReviewDTO {
  product_id: string;
  customer_name: string;
  customer_id?: string | null;
  rating: number;
  title?: string | null;
  body: string;
}

export interface ProductReviewDTO {
  id: string;
  product_id: string;
  customer_name: string;
  customer_id: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ProductReviewSummary {
  reviews: ProductReviewDTO[];
  count: number;
  /** Mean of approved ratings, rounded to 1dp; null when there are none. */
  average: number | null;
}
