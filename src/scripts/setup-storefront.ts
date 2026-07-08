/**
 * Chaubandi Storefront Sync
 * Run with: npx medusa exec ./src/scripts/setup-storefront.ts
 *
 * Aligns the backend catalog with the Vite storefront:
 *   1. Creates the 12 curated storefront products (Size option → variants,
 *      presentation data in metadata: cat/badge/color/rating/reviews/images).
 *   2. Drafts the old placeholder seed products so the store API returns
 *      only the curated catalog.
 *   3. Adds pp_system_default to the US region (Stripe keys are placeholders,
 *      so demo checkout completes through the system provider).
 *   4. Makes "Standard Shipping" free to match the storefront's
 *      "free USA shipping" promise.
 */

import {
  createProductsWorkflow,
  updateProductsWorkflow,
  updateRegionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";

// Mirrors PRODUCTS in the Vite frontend (src/App.jsx). Prices are USD major
// units (Medusa v2 uses decimal amounts). Presentation-only fields live in
// metadata so the storefront stays fully API-driven.
const STOREFRONT_PRODUCTS = [
  {
    title: "Multicolor Patchwork Embroidered Lehenga",
    handle: "multicolor-patchwork-embroidered-lehenga",
    price: 489,
    cat: "Lehengas",
    badge: "New Arrival",
    color: "linear-gradient(140deg,#2a1f2d,#4a2040 25%,#c5a255 45%,#d4466a 60%,#1a3a2a 80%)",
    images: ["/Products/Lehenga-Demo/img1.jpg", "/Products/Lehenga-Demo/img2.jpg", "/Products/Lehenga-Demo/img3.jpg"],
    rating: 4.9,
    reviews: 47,
    desc: "Rich multicolor patchwork with geometric and floral motifs, peacock borders, and mirror work. Includes embroidered blouse and black velvet dupatta.",
    sizes: ["XS", "S", "M", "L", "XL", "Custom"],
  },
  {
    title: "Black Embroidered Sherwani Set",
    handle: "black-embroidered-sherwani-set",
    price: 399,
    cat: "Sherwanis",
    badge: "Trending",
    color: "linear-gradient(140deg,#0c0a09,#1e1b18 40%,#2a2420 70%,#0c0a09)",
    images: [],
    rating: 4.8,
    reviews: 32,
    desc: "Intricate geometric embroidery on premium black fabric. Complete set with kurta, sherwani jacket, and churidar.",
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    title: "Teal Green Embroidered Silk Lehenga",
    handle: "teal-green-embroidered-silk-lehenga",
    price: 349,
    cat: "Lehengas",
    badge: "Bestseller",
    color: "linear-gradient(140deg,#0a4a4a,#1a6a5a 50%,#0a3a3a)",
    images: [
      "/Products/Lehenga/WhatsApp Image 2026-05-05 at 12.20.34 AM (1).jpeg",
      "/Products/Lehenga/WhatsApp Image 2026-05-05 at 12.20.34 AM (2).jpeg",
    ],
    rating: 4.7,
    reviews: 58,
    desc: "Handwoven silk with delicate thread and zari embroidery. Net dupatta with matching border.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    title: "Maroon Velvet Bridal Lehenga",
    handle: "maroon-velvet-bridal-lehenga",
    price: 599,
    cat: "Bridal",
    badge: "Bridal",
    color: "linear-gradient(140deg,#3a0818,#6a1830 50%,#3a0818)",
    images: [],
    rating: 5.0,
    reviews: 21,
    desc: "Luxurious velvet lehenga with heavy zardozi and stone work. Premium bridal collection with matching jewelry set.",
    sizes: ["S", "M", "L", "XL", "Custom"],
  },
  {
    title: "Royal Blue Brocade Lehenga",
    handle: "royal-blue-brocade-lehenga",
    price: 429,
    cat: "Lehengas",
    badge: "New",
    color: "linear-gradient(140deg,#0a1040,#1a2080 50%,#0a1040)",
    images: [
      "/Products/Lehenga/WhatsApp Image 2026-05-05 at 12.20.34 AM (3).jpeg",
      "/Products/Lehenga/WhatsApp Image 2026-05-05 at 12.20.34 AM (4).jpeg",
    ],
    rating: 4.6,
    reviews: 19,
    desc: "Rich brocade fabric with gold woven patterns. Paired with contrast gold blouse and net dupatta.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    title: "Gold Embroidered Anarkali Suit",
    handle: "gold-embroidered-anarkali-suit",
    price: 279,
    cat: "Anarkali",
    color: "linear-gradient(140deg,#3a2a10,#6a4a20 50%,#3a2a10)",
    images: [],
    rating: 4.8,
    reviews: 34,
    desc: "Floor-length anarkali with heavy gold embroidery. Includes churidar and matching dupatta.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    title: "Blush Pink Embroidered Saree",
    handle: "blush-pink-embroidered-saree",
    price: 319,
    cat: "Sarees",
    badge: "Popular",
    color: "linear-gradient(140deg,#6a3a3a,#a06060 50%,#6a3a3a)",
    images: [
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM.jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (1).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (2).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (3).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (4).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (5).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (6).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (7).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (8).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.53 AM (9).jpeg",
    ],
    rating: 4.7,
    reviews: 41,
    desc: "Soft georgette saree with pearl and sequin work. Pre-stitched option available. Includes matching blouse.",
    sizes: ["Free Size"],
  },
  {
    title: "Emerald Sharara Set",
    handle: "emerald-sharara-set",
    price: 459,
    cat: "Sharara",
    badge: "New",
    color: "linear-gradient(140deg,#0a3a1a,#1a5a2a 50%,#0a3a1a)",
    images: [],
    rating: 4.9,
    reviews: 16,
    desc: "Luxurious sharara with heavy thread embroidery and mirror work. Three-piece set with crop top and dupatta.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    title: "Ivory Pearl Work Bridal Lehenga",
    handle: "ivory-pearl-work-bridal-lehenga",
    price: 529,
    cat: "Bridal",
    color: "linear-gradient(140deg,#8a7a6a,#c0b0a0 50%,#8a7a6a)",
    images: [],
    rating: 4.8,
    reviews: 27,
    desc: "Ivory silk lehenga with thousands of hand-sewn pearls and crystal beading. A modern bridal masterpiece.",
    sizes: ["S", "M", "L", "XL", "Custom"],
  },
  {
    title: "Navy Silk Kurta Pajama",
    handle: "navy-silk-kurta-pajama",
    price: 189,
    cat: "Sherwanis",
    color: "linear-gradient(140deg,#0a1030,#1a2050 50%,#0a1030)",
    images: [],
    rating: 4.5,
    reviews: 53,
    desc: "Pure silk kurta with subtle self-print and button detailing. Comfortable fit for festive occasions.",
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    title: "Red Banarasi Saree",
    handle: "red-banarasi-saree",
    price: 389,
    cat: "Sarees",
    badge: "Heritage",
    color: "linear-gradient(140deg,#5a0a0a,#8a1a1a 50%,#5a0a0a)",
    images: [
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM.jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (1).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (2).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (3).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (4).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (5).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (6).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (7).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (8).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (9).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (10).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (11).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (12).jpeg",
      "/Products/Sarees/WhatsApp Image 2026-05-05 at 1.07.54 AM (13).jpeg",
    ],
    rating: 4.9,
    reviews: 38,
    desc: "Authentic Banarasi silk with traditional gold zari motifs. Handwoven by master artisans.",
    sizes: ["Free Size"],
  },
  {
    title: "Pastel Mint Sharara Set",
    handle: "pastel-mint-sharara-set",
    price: 339,
    cat: "Sharara",
    color: "linear-gradient(140deg,#3a6a5a,#5a9a8a 50%,#3a6a5a)",
    images: [],
    rating: 4.6,
    reviews: 22,
    desc: "Light and breezy mint sharara with delicate sequin scatter. Perfect for summer celebrations.",
    sizes: ["S", "M", "L", "XL"],
  },
];

// Placeholder products from the original seed — hidden from the storefront.
const OLD_SEED_HANDLES = [
  "bridal-red-lehenga",
  "pastel-pink-lehenga",
  "royal-blue-lehenga",
  "ivory-wedding-gown",
  "crimson-wedding-saree",
  "anarkali-salwar-set",
  "punjabi-patiala-suit",
  "nehru-jacket-suit",
  "embroidered-sherwani",
  "designer-saree-blouse",
  "high-neck-blouse",
  "kids-lehenga-choli",
  "boys-kurta-pajama",
  "silk-dupatta",
  "potli-bag",
  "bridal-mojari",
  "kolhapuri-chappal",
  "kundan-necklace-set",
  "temple-jewellery-set",
  "oxidized-silver-earrings",
];

function skuFor(handle: string, size: string) {
  const sizeCode = size.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  return `${handle.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${sizeCode}`;
}

export default async function setupStorefront({ container }: { container: any }) {
  const logger: Logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const regionModuleService = container.resolve(Modules.REGION);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  logger.info("🌸 Chaubandi storefront sync starting...");

  const salesChannel = (
    await salesChannelModuleService.listSalesChannels({
      name: "Chaubandi Storefront",
    })
  )[0];
  if (!salesChannel) {
    throw new Error("Sales channel 'Chaubandi Storefront' not found — run seed.ts first");
  }

  const shippingProfile = (
    await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  )[0];
  if (!shippingProfile) {
    throw new Error("Default shipping profile not found — run seed.ts first");
  }

  // ─── 1. Create the curated storefront products ───
  let created = 0;
  for (const p of STOREFRONT_PRODUCTS) {
    const existing = await productModuleService.listProducts({ handle: p.handle });
    if (existing.length > 0) {
      continue;
    }
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: p.title,
            handle: p.handle,
            description: p.desc,
            status: "published" as const,
            options: [{ title: "Size", values: p.sizes }],
            variants: p.sizes.map((size) => ({
              title: size,
              sku: skuFor(p.handle, size),
              manage_inventory: false,
              options: { Size: size },
              prices: [{ amount: p.price, currency_code: "usd" }],
            })),
            ...(p.images.length
              ? {
                  thumbnail: p.images[0],
                  images: p.images.map((url) => ({ url })),
                }
              : {}),
            metadata: {
              cat: p.cat,
              badge: (p as any).badge ?? null,
              color: p.color,
              rating: p.rating,
              reviews: p.reviews,
              images: p.images,
            },
            sales_channels: [{ id: salesChannel.id }],
            shipping_profile_id: shippingProfile.id,
          },
        ],
      },
    });
    created++;
    logger.info(`   📦 ${p.title}`);
  }
  logger.info(`✅ Storefront products: ${created} created, ${STOREFRONT_PRODUCTS.length - created} already existed`);

  // ─── 2. Draft the old placeholder products ───
  const oldProducts = await productModuleService.listProducts({
    handle: OLD_SEED_HANDLES,
    status: "published",
  });
  if (oldProducts.length > 0) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { handle: OLD_SEED_HANDLES },
        update: { status: "draft" as const },
      },
    });
    logger.info(`✅ Drafted ${oldProducts.length} placeholder seed products`);
  } else {
    logger.info("ℹ️  No published placeholder products to draft");
  }

  // ─── 3. Enable system payment provider on the US region ───
  const region = (
    await regionModuleService.listRegions({ name: "United States" })
  )[0];
  if (!region) {
    throw new Error("Region 'United States' not found — run seed.ts first");
  }
  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: {
        // Keep Stripe registered for when real keys arrive; system default
        // lets demo checkout complete without them.
        payment_providers: ["pp_stripe_stripe", "pp_system_default"],
      },
    },
  });
  logger.info("✅ Region payment providers: pp_stripe_stripe + pp_system_default");

  // ─── 4. Make Standard Shipping free (storefront promises free US shipping) ───
  const standardOptions = await fulfillmentModuleService.listShippingOptions({
    name: "Standard Shipping",
  });
  if (standardOptions.length > 0) {
    await updateShippingOptionsWorkflow(container).run({
      input: [
        {
          id: standardOptions[0].id,
          prices: [
            { currency_code: "usd", amount: 0 },
            { region_id: region.id, amount: 0 },
          ],
        },
      ],
    });
    logger.info("✅ Standard Shipping is now free");
  } else {
    logger.info("⚠️  'Standard Shipping' option not found — skipped price update");
  }

  logger.info("");
  logger.info("═══════════════════════════════════════════════");
  logger.info("🌸 Storefront sync complete");
  logger.info(`   Products live: ${STOREFRONT_PRODUCTS.length} curated storefront items`);
  logger.info("   Payment: pp_system_default enabled for demo checkout");
  logger.info("   Shipping: Standard $0 / Arlington pickup $0");
  logger.info("═══════════════════════════════════════════════");
}
