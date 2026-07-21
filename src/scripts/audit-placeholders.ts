/**
 * Placeholder Catalog Audit
 * Run with: npm run audit:placeholders
 *
 * Lists every product carrying metadata.placeholder === true with its
 * style_no, title and price, grouped by category, and flags any product
 * missing a required metadata key. Use this before launch to confirm which
 * listings still need real photography, copy and pricing.
 */

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";

const CATEGORY_ORDER = [
  "lehengas",
  "sarees",
  "wedding-dresses",
  "salwars",
  "suits",
  "blouses",
  "kids-wear",
  "accessories",
  "shoes",
  "jewellery",
];

const REQUIRED_KEYS = [
  "placeholder",
  "style_no",
  "category",
  "color",
  "fabric",
  "occasion",
  "style_tips",
  "fit_tips",
  "care",
  "customizable",
];

export default async function auditPlaceholders({
  container,
}: {
  container: any;
}) {
  const logger: Logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const pricingModuleService = container.resolve(Modules.PRICING);

  const products = await productModuleService.listProducts(
    {},
    { relations: ["variants", "options"], take: 1000 }
  );

  const placeholders = products.filter(
    (p: any) => p.metadata?.placeholder === true
  );

  if (placeholders.length === 0) {
    logger.info("No placeholder products found. Run `npm run seed:catalog`.");
    return;
  }

  // Prices live in the Pricing module; resolve them per variant price set.
  const priceByVariant = new Map<string, string>();
  try {
    const variantIds = placeholders.flatMap((p: any) =>
      (p.variants || []).map((v: any) => v.id)
    );
    const link = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await link.graph({
      entity: "variant",
      fields: ["id", "prices.amount", "prices.currency_code"],
      filters: { id: variantIds },
    });
    for (const v of data) {
      const usd = (v.prices || []).find(
        (pr: any) => pr.currency_code === "usd"
      );
      if (usd) priceByVariant.set(v.id, `$${usd.amount}`);
    }
  } catch {
    // Price graph is best-effort — the audit is still useful without it.
  }

  const byCategory = new Map<string, any[]>();
  for (const p of placeholders) {
    const cat = (p.metadata?.category as string) || "(uncategorized)";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  const issues: string[] = [];
  const seenStyleNos = new Set<string>();

  logger.info("");
  logger.info("=== PLACEHOLDER AUDIT ===");

  const categories = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  for (const cat of categories) {
    const items = byCategory
      .get(cat)!
      .sort((a: any, b: any) =>
        String(a.metadata?.style_no).localeCompare(String(b.metadata?.style_no))
      );

    logger.info("");
    logger.info(`── ${cat} (${items.length}) ──`);

    for (const p of items) {
      const styleNo = (p.metadata?.style_no as string) || "(no style_no)";
      const price =
        priceByVariant.get((p.variants || [])[0]?.id) ?? "(price unresolved)";
      logger.info(`  ${styleNo.padEnd(12)} ${price.padEnd(8)} ${p.title}`);

      if (seenStyleNos.has(styleNo)) {
        issues.push(`Duplicate style_no ${styleNo} (${p.title})`);
      }
      seenStyleNos.add(styleNo);

      for (const key of REQUIRED_KEYS) {
        if (p.metadata?.[key] === undefined || p.metadata?.[key] === null) {
          issues.push(`${styleNo}: missing metadata.${key}`);
        }
      }
      const sizeOption = (p.options || []).find((o: any) => o.title === "Size");
      if ((p.options || []).length > 0 && !sizeOption) {
        issues.push(`${styleNo}: no option titled "Size"`);
      }
    }
  }

  logger.info("");
  logger.info("─────────────────────────────");
  logger.info(`Total placeholder products: ${placeholders.length}`);
  logger.info(`Categories: ${categories.length}`);
  if (issues.length === 0) {
    logger.info("Metadata contract: OK — no issues found.");
  } else {
    logger.info(`Metadata contract: ${issues.length} issue(s):`);
    for (const issue of issues) {
      logger.info(`  ⚠️  ${issue}`);
    }
  }
  logger.info("─────────────────────────────");
  logger.info("");
}
