/**
 * Prune legacy sample products
 * Run with: npm run prune:legacy          (lists what would go — dry run)
 *           PRUNE_CONFIRM=yes npm run prune:legacy   (actually deletes)
 *
 * The original seed created a handful of hand-written sample products before
 * the canonical placeholder catalog existed. They carry no metadata contract,
 * so they break storefront filtering and PDP rendering.
 *
 * A product is legacy when it has no `metadata.placeholder === true`. That is
 * the only signal used, so anything created by `npm run seed:catalog` is safe
 * by construction. Dry run by default — deleting products is not reversible.
 */

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";

export default async function pruneLegacyProducts({
  container,
}: {
  container: any;
}) {
  const logger: Logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  const products = await productModuleService.listProducts({}, { take: 1000 });

  const legacy = products.filter(
    (p: any) => p.metadata?.placeholder !== true
  );
  const keep = products.length - legacy.length;

  logger.info("");
  logger.info("=== LEGACY PRODUCT PRUNE ===");
  logger.info(`Total products:        ${products.length}`);
  logger.info(`Placeholder catalog:   ${keep}  (kept)`);
  logger.info(`Legacy sample records: ${legacy.length}`);
  logger.info("");

  if (legacy.length === 0) {
    logger.info("Nothing to prune.");
    return;
  }

  for (const p of legacy) {
    logger.info(`  ${p.handle}  -  ${p.title}`);
  }
  logger.info("");

  if (process.env.PRUNE_CONFIRM !== "yes") {
    logger.info(
      "DRY RUN — nothing deleted. Re-run with PRUNE_CONFIRM=yes to delete these."
    );
    return;
  }

  await productModuleService.deleteProducts(legacy.map((p: any) => p.id));

  logger.info(`Deleted ${legacy.length} legacy product(s).`);
  logger.info(`Catalog is now ${keep} products.`);
  logger.info("");
}
