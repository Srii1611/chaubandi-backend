import { defineLink } from "@medusajs/framework/utils";
import MeasurementsModule from "../modules/measurements";
import CustomerModule from "@medusajs/medusa/customer";

/**
 * Read-only link: Measurement -> Customer
 * Resolves measurement.customer_id to the customer record,
 * so queries can expand `measurement.customer.*`.
 */
export default defineLink(
  {
    linkable: MeasurementsModule.linkable.measurement,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
);
