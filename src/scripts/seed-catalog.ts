/**
 * Chaubandi Placeholder Catalog Seeder
 * Run with: npm run seed:catalog   (medusa exec ./src/scripts/seed-catalog.ts)
 *
 * Seeds the canonical storefront taxonomy: 10 categories x 20 products = 200.
 * Every product is a *placeholder* (metadata.placeholder === true) carrying the
 * full metadata contract the storefront PDP reads. Final photography, copy and
 * pricing are confirmed by Chaubandi before launch.
 *
 * Idempotent: products are keyed by handle, so re-running is a no-op for
 * anything already present. All rotations are index-driven (no randomness),
 * so a re-run produces byte-identical data.
 *
 * Prerequisite: `npm run seed` (region, sales channel, publishable key,
 * shipping profile) must have run at least once.
 */

import fs from "fs";
import path from "path";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";

// ─────────────────────────────────────────────────────────────
// Canonical taxonomy — these handles are a contract shared with
// the storefront router. Do not rename without changing both.
// ─────────────────────────────────────────────────────────────

type CategoryKey =
  | "lehengas"
  | "sarees"
  | "wedding-dresses"
  | "salwars"
  | "suits"
  | "blouses"
  | "kids-wear"
  | "accessories"
  | "shoes"
  | "jewellery";

interface CategorySpec {
  handle: CategoryKey;
  display: string;
  prefix: string;
  sizes: string[];
  priceRange: [number, number];
  canCan: boolean;
  customizable: boolean;
  apparel: boolean;
  packContains: string | null;
  styleTips: string;
  fitTips: string;
  /** Noun used to build product titles. */
  noun: string;
  count: number;
}

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "Custom"];

const CATEGORY_CONFIG: Record<CategoryKey, CategorySpec> = {
  lehengas: {
    handle: "lehengas",
    display: "Lehengas",
    prefix: "CH-LEH",
    sizes: APPAREL_SIZES,
    priceRange: [299, 899],
    canCan: true,
    customizable: true,
    apparel: true,
    packContains: "1 Blouse, 1 Lehenga, 1 Dupatta",
    styleTips:
      "A voluminous silhouette with intricate embroidery - perfect for bridal and special occasions.",
    fitTips: "Choose size by bust; the lehenga waist is managed via zip.",
    noun: "Lehenga",
    count: 20,
  },
  sarees: {
    handle: "sarees",
    display: "Sarees",
    prefix: "CH-SAR",
    sizes: ["Free Size", "Custom Blouse"],
    priceRange: [149, 599],
    canCan: false,
    customizable: true,
    apparel: true,
    packContains: "1 Saree, 1 Unstitched Blouse Piece",
    styleTips: "Drape vertically to frame the shoulders and embroidery.",
    fitTips:
      "Free size; adjust pleats to your waist. Blouse can be custom-stitched to your measurements.",
    noun: "Saree",
    count: 20,
  },
  "wedding-dresses": {
    handle: "wedding-dresses",
    display: "Wedding Dresses",
    prefix: "CH-WED",
    sizes: APPAREL_SIZES,
    priceRange: [599, 1999],
    canCan: true,
    customizable: true,
    apparel: true,
    packContains: "1 Blouse, 1 Lehenga, 1 Dupatta",
    styleTips: "Make a statement as the bride or celebration guest.",
    fitTips: "Custom size recommended for the perfect bridal fit.",
    noun: "Wedding Ensemble",
    count: 20,
  },
  salwars: {
    handle: "salwars",
    display: "Salwar Kameez",
    prefix: "CH-SAL",
    sizes: APPAREL_SIZES,
    priceRange: [129, 399],
    canCan: false,
    customizable: true,
    apparel: true,
    packContains: "1 Kameez, 1 Bottom, 1 Dupatta",
    styleTips: "Comfort meets elegance in this traditional ensemble.",
    fitTips:
      "Choose size by bust; bottom length can be hemmed to your height.",
    noun: "Salwar Kameez",
    count: 20,
  },
  suits: {
    handle: "suits",
    display: "Suits & Anarkalis",
    prefix: "CH-SUI",
    sizes: APPAREL_SIZES,
    priceRange: [149, 449],
    canCan: false,
    customizable: true,
    apparel: true,
    packContains: "1 Kameez, 1 Bottom, 1 Dupatta",
    styleTips:
      "Modern anarkali or structured suit - transitions from sangeet to reception.",
    fitTips:
      "Select by bust; we adjust length and fit details to your frame.",
    noun: "Anarkali Suit",
    count: 20,
  },
  blouses: {
    handle: "blouses",
    display: "Blouses",
    prefix: "CH-BLO",
    sizes: APPAREL_SIZES,
    priceRange: [59, 199],
    canCan: false,
    customizable: true,
    apparel: true,
    packContains: "1 Blouse",
    styleTips: "A versatile layering piece or statement top.",
    fitTips: "Choose size by bust.",
    noun: "Blouse",
    count: 20,
  },
  "kids-wear": {
    handle: "kids-wear",
    display: "Kids Wear",
    prefix: "CH-KID",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"],
    priceRange: [49, 179],
    canCan: false,
    customizable: false,
    apparel: true,
    packContains: "1 Outfit Set",
    styleTips: "Festive and fun designs for little ones.",
    fitTips: "Choose by age range for the best fit.",
    noun: "Kids Outfit",
    count: 20,
  },
  accessories: {
    handle: "accessories",
    display: "Accessories",
    prefix: "CH-ACC",
    sizes: ["One Size"],
    priceRange: [19, 99],
    canCan: false,
    customizable: false,
    apparel: false,
    packContains: null,
    styleTips: "Complete any outfit with heritage-inspired details.",
    fitTips: "One size; adjustable where applicable.",
    noun: "Accessory",
    count: 20,
  },
  shoes: {
    handle: "shoes",
    display: "Shoes & Boots",
    prefix: "CH-SHO",
    sizes: ["US 5", "US 6", "US 7", "US 8", "US 9", "US 10", "US 11"],
    priceRange: [39, 149],
    canCan: false,
    customizable: false,
    apparel: false,
    packContains: null,
    styleTips: "Crafted comfort for wedding and celebration wear.",
    fitTips: "Choose your US shoe size; runs true to size.",
    noun: "Footwear",
    count: 20,
  },
  jewellery: {
    handle: "jewellery",
    display: "Jewellery",
    prefix: "CH-JWL",
    sizes: ["One Size"],
    priceRange: [29, 299],
    canCan: false,
    customizable: false,
    apparel: false,
    packContains: null,
    styleTips: "Hand-crafted pieces that complement ethnic wear perfectly.",
    fitTips: "One size; all pieces are adjustable for comfort.",
    noun: "Jewellery Set",
    count: 20,
  },
};

const CATEGORY_ORDER = Object.keys(CATEGORY_CONFIG) as CategoryKey[];

// ─── Rotation pools (deterministic, index-driven) ───

const COLORS = [
  "Emerald",
  "Ruby Red",
  "Royal Blue",
  "Blush Pink",
  "Ivory",
  "Gold",
  "Deep Maroon",
  "Teal",
  "Lavender",
  "Mustard",
  "Peach",
  "Black",
];

const FABRICS = [
  "Silk",
  "Georgette",
  "Velvet",
  "Net",
  "Organza",
  "Chiffon",
  "Raw Silk",
  "Cotton Silk",
];

const WORK = [
  "Zari",
  "Sequins",
  "Zardosi",
  "Mirror Work",
  "Thread Embroidery",
  "Gota Patti",
  "Stone Work",
  "Cut Dana",
];

const OCCASIONS = [
  "bridal",
  "wedding-guest",
  "sangeet-mehendi",
  "festive",
  "party",
  "everyday",
] as const;

const OCCASION_COLLECTIONS: { handle: string; title: string }[] = [
  { handle: "bridal", title: "Bridal" },
  { handle: "wedding-guest", title: "Wedding Guest" },
  { handle: "sangeet-mehendi", title: "Sangeet & Mehendi" },
  { handle: "festive", title: "Festive" },
  { handle: "party", title: "Party" },
  { handle: "everyday", title: "Everyday Elegance" },
];

/** 20 distinct descriptors — one per product slot, so titles never collide. */
const STYLE_WORDS = [
  "Heritage",
  "Regal",
  "Celestial",
  "Meadow",
  "Aurora",
  "Kashi",
  "Monsoon",
  "Lotus",
  "Zephyr",
  "Banaras",
  "Twilight",
  "Marigold",
  "Jaipur",
  "Nightfall",
  "Sunlit",
  "Pahadi",
  "Rosewood",
  "Kathmandu",
  "Amber",
  "Mirage",
];

/** Products with a badge, per category (index within the category). */
const BADGED_SLOTS: Record<number, "New Arrival" | "Best Seller"> = {
  0: "New Arrival",
  4: "Best Seller",
  9: "New Arrival",
  14: "Best Seller",
};

// ASCII only: on Windows `medusa exec` reads this source as Latin-1, so any
// non-ASCII character in seeded *data* lands in the database as mojibake.
// Comments are safe; strings that reach Postgres must stay ASCII.
const PLACEHOLDER_NOTE =
  "Placeholder listing - final photography, description, and pricing will be confirmed by Chaubandi before launch.";

const BACKEND_URL = (
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Spread `count` prices evenly across [min, max], snapped to the nearest
 * charm price (…9). Deterministic, so re-runs never drift.
 */
function priceFor(index: number, spec: CategorySpec): number {
  const [min, max] = spec.priceRange;
  const step = spec.count > 1 ? (max - min) / (spec.count - 1) : 0;
  const raw = min + index * step;
  return Math.round((raw + 1) / 10) * 10 - 1;
}

/** 1–2 occasions per product; the first is also the product's collection. */
function occasionsFor(index: number): string[] {
  const first = OCCASIONS[index % OCCASIONS.length];
  // Every third product gets a second, non-duplicate occasion.
  if (index % 3 !== 0) {
    return [first];
  }
  const second = OCCASIONS[(index + 2) % OCCASIONS.length];
  return second === first ? [first] : [first, second];
}

/**
 * One placeholder image per category (10 files, shared across 200 products),
 * written to static/ and served by the local file provider. 1200x1600 (3:4),
 * near-black ground, thin gold rule, serif category name.
 */
function placeholderSvg(spec: CategorySpec): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-label="${spec.display} - photography coming soon">
  <rect width="1200" height="1600" fill="#0d0a08"/>
  <rect x="40" y="40" width="1120" height="1520" fill="none" stroke="#c5a255" stroke-width="2"/>
  <text x="600" y="740" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="86" fill="#f4ece0">${spec.display}</text>
  <text x="600" y="820" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#c5a255" letter-spacing="6">${spec.prefix}</text>
  <text x="600" y="1480" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#8a7f72" letter-spacing="8">PHOTOGRAPHY COMING SOON</text>
</svg>`;
}

function writePlaceholderImages(logger: Logger): Record<CategoryKey, string> {
  const dir = path.join(process.cwd(), "static", "placeholders");
  fs.mkdirSync(dir, { recursive: true });

  const urls = {} as Record<CategoryKey, string>;
  for (const key of CATEGORY_ORDER) {
    const spec = CATEGORY_CONFIG[key];
    const filename = `${key}.svg`;
    fs.writeFileSync(path.join(dir, filename), placeholderSvg(spec), "utf8");
    urls[key] = `${BACKEND_URL}/static/placeholders/${filename}`;
  }
  logger.info(
    `🖼️  Wrote ${CATEGORY_ORDER.length} placeholder images to static/placeholders/`
  );
  return urls;
}

// ─────────────────────────────────────────────────────────────
// Product generation
// ─────────────────────────────────────────────────────────────

function buildProduct(
  spec: CategorySpec,
  index: number,
  categoryId: string,
  collectionId: string | undefined,
  imageUrl: string
) {
  const seq = String(index + 1).padStart(3, "0");
  const styleNo = `${spec.prefix}-${seq}`;
  const color = COLORS[index % COLORS.length];
  const fabric = FABRICS[index % FABRICS.length];
  const work = `${WORK[index % WORK.length]}, ${
    WORK[(index + 3) % WORK.length]
  }`;
  const occasion = occasionsFor(index);
  const price = priceFor(index, spec);
  const badge = BADGED_SLOTS[index] ?? null;
  const title = `${STYLE_WORDS[index % STYLE_WORDS.length]} ${color} ${spec.noun}`;

  const metadata: Record<string, any> = {
    placeholder: true,
    style_no: styleNo,
    category: spec.handle,
    color,
    fabric,
    occasion,
    style_tips: spec.styleTips,
    fit_tips: spec.fitTips,
    care: "Dry clean only",
    badge,
    customizable: spec.customizable,
  };
  if (spec.apparel) {
    metadata.work = work;
  }
  if (spec.packContains) {
    metadata.pack_contains = spec.packContains;
  }
  if (spec.canCan) {
    metadata.can_can = "Yes";
  }

  const description =
    `${title} in ${fabric.toLowerCase()}, finished in a ${color.toLowerCase()} palette. ` +
    `Made for ${occasion.join(" and ").replace(/-/g, " ")} occasions. ` +
    PLACEHOLDER_NOTE;

  return {
    title,
    handle: `${slugify(title)}-${slugify(styleNo)}`,
    description,
    status: "published" as const,
    category_ids: [categoryId],
    ...(collectionId ? { collection_id: collectionId } : {}),
    // Three copies of the category placeholder so the gallery/thumbnail UI
    // is exercised end to end. The ?v suffix keeps the URLs distinct.
    images: [1, 2, 3].map((n) => ({ url: `${imageUrl}?v=${n}` })),
    options: [{ title: "Size", values: spec.sizes }],
    variants: spec.sizes.map((size) => ({
      title: size,
      sku: `${styleNo}-${size.toUpperCase().replace(/\s+/g, "")}`,
      manage_inventory: false,
      options: { Size: size },
      prices: [{ amount: price, currency_code: "usd" }],
    })),
    metadata,
  };
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

export default async function seedCatalog({ container }: { container: any }) {
  const logger: Logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const apiKeyModuleService = container.resolve(Modules.API_KEY);

  logger.info("🌸 Chaubandi catalog seed starting...");

  // ─── Prerequisites from the infra seed ───
  const salesChannel = (
    await salesChannelModuleService.listSalesChannels({
      name: "Chaubandi Storefront",
    })
  )[0];
  if (!salesChannel) {
    throw new Error(
      "Sales channel 'Chaubandi Storefront' not found — run `npm run seed` first."
    );
  }

  const shippingProfile = (
    await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  )[0];
  if (!shippingProfile) {
    throw new Error(
      "No default shipping profile found — run `npm run seed` first."
    );
  }

  // ─── Occasion collections ───
  const collectionIds: Record<string, string> = {};
  for (const { handle, title } of OCCASION_COLLECTIONS) {
    let collection = (
      await productModuleService.listProductCollections({ handle })
    )[0];
    if (!collection) {
      collection = await productModuleService.createProductCollections({
        title,
        handle,
      });
    }
    collectionIds[handle] = collection.id;
  }
  logger.info(
    `✅ ${OCCASION_COLLECTIONS.length} occasion collections ready (${OCCASION_COLLECTIONS.map(
      (c) => c.handle
    ).join(", ")})`
  );

  // ─── Categories ───
  const categoryIds = {} as Record<CategoryKey, string>;
  for (const key of CATEGORY_ORDER) {
    const spec = CATEGORY_CONFIG[key];
    let category = (
      await productModuleService.listProductCategories({ handle: key })
    )[0];
    if (!category) {
      category = await productModuleService.createProductCategories({
        name: spec.display,
        description: `Chaubandi ${spec.display} collection`,
        handle: key,
        is_active: true,
        is_internal: false,
        rank: CATEGORY_ORDER.indexOf(key),
      });
    }
    categoryIds[key] = category.id;
  }
  logger.info(`✅ ${CATEGORY_ORDER.length} categories ready`);

  // ─── Placeholder imagery ───
  const imageUrls = writePlaceholderImages(logger);

  // ─── Products ───
  const perCategory: Record<string, number> = {};
  let created = 0;
  let refreshed = 0;
  let reimaged = 0;

  for (const key of CATEGORY_ORDER) {
    const spec = CATEGORY_CONFIG[key];
    for (let i = 0; i < spec.count; i++) {
      // Medusa v2 products belong to a single collection, so the *primary*
      // occasion drives collection membership; the full list stays in
      // metadata.occasion for storefront filtering.
      const primaryOccasion = occasionsFor(i)[0];
      const product = buildProduct(
        spec,
        i,
        categoryIds[key],
        collectionIds[primaryOccasion],
        imageUrls[key]
      );

      const existing = await productModuleService.listProducts({
        handle: product.handle,
      });
      if (existing.length > 0) {
        // Already seeded: refresh in place so template edits (and any
        // previously mis-encoded text) propagate without tearing the catalog
        // down. Variants are left alone — they are keyed by SKU and unchanged
        // by a copy edit.
        const current = existing[0] as any;
        const update: Record<string, any> = {
          title: product.title,
          description: product.description,
          metadata: product.metadata,
        };

        // Image URLs are absolute and were stored against whatever
        // MEDUSA_BACKEND_URL pointed at when the catalog was first seeded — so
        // a catalog seeded on a laptop carries localhost links that resolve
        // nowhere else. Re-point them, but ONLY for placeholder artwork: real
        // photography must never be overwritten by a re-run.
        const currentUrls: string[] = (current.images || []).map((i: any) => i.url);
        const allPlaceholders =
          currentUrls.length > 0 &&
          currentUrls.every((u) => u.includes("/static/placeholders/"));
        const wanted = product.images.map((i) => i.url);
        if (
          allPlaceholders &&
          currentUrls.join("|") !== wanted.join("|")
        ) {
          update.images = wanted.map((url) => ({ url }));
          reimaged++;
        }

        await productModuleService.updateProducts(current.id, update);
        refreshed++;
        continue;
      }

      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              ...product,
              sales_channels: [{ id: salesChannel.id }],
              shipping_profile_id: shippingProfile.id,
            },
          ],
        },
      });
      created++;
    }
    perCategory[key] = spec.count;
    logger.info(`   📦 ${key}: ${spec.count}`);
  }

  const apiKey = (
    await apiKeyModuleService.listApiKeys({ title: "Chaubandi Storefront Key" })
  )[0];

  const total = CATEGORY_ORDER.reduce(
    (sum, key) => sum + CATEGORY_CONFIG[key].count,
    0
  );

  logger.info("");
  logger.info("=== SEED COMPLETE ===");
  logger.info(`Publishable API Key: ${apiKey?.token ?? "(run `npm run seed`)"}`);
  logger.info(`Backend URL: ${BACKEND_URL}   <- image URLs are built from this`);
  logger.info("Products seeded:");
  for (const key of CATEGORY_ORDER) {
    logger.info(`  ${key}: ${perCategory[key]}`);
  }
  logger.info(
    `Total: ${total}  (created ${created}, refreshed ${refreshed}, images re-pointed ${reimaged})`
  );
  logger.info(
    `Collections: ${OCCASION_COLLECTIONS.length} (${OCCASION_COLLECTIONS.map(
      (c) => c.handle
    ).join(", ")})`
  );
  logger.info("");
}
