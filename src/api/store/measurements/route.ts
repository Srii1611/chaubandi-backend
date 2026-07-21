/**
 * Legacy alias for the customer measurement chart.
 *
 * The canonical path is /store/customers/me/measurements — this route is kept
 * so storefront builds shipped before the rename keep working. Both paths
 * share one implementation; delete this file once the storefront is updated.
 */
export {
  GET,
  POST,
} from "../customers/me/measurements/route";
