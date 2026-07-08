/**
 * Chaubandi Seed Script
 * Run with: medusa exec ./src/scripts/seed.ts
 *
 * Seeds:
 *   - Region: United States (USD)
 *   - Sales Channel: "Chaubandi Storefront"
 *   - Publishable API Key (scoped to sales channel)
 *   - 9 Product Categories
 *   - ~20 Sample Products with variants (size + color)
 *   - US Tax Region
 */

import {
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createApiKeysWorkflow,
  createTaxRegionsWorkflow,
  createStockLocationsWorkflow,
  createShippingProfilesWorkflow,
  createShippingOptionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";

const CATEGORIES = [
  "Lehengas",
  "Wedding Dresses",
  "Salwars",
  "Suits",
  "Blouses",
  "Kids",
  "Accessories",
  "Shoes",
  "Jewellery",
];

const IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80";

function generateProducts(category: string, categoryId: string) {
  const products: any[] = [];

  switch (category) {
    case "Lehengas":
      products.push(
        {
          title: "Bridal Red Lehenga",
          description:
            "Hand-embroidered bridal lehenga in rich crimson red with gold zari work. Perfect for wedding ceremonies. Includes matching dupatta and blouse piece.",
          handle: "bridal-red-lehenga",
          variants: [
            { title: "Small / Red", sku: "LEH-RED-S", prices: [{ amount: 1200, currency_code: "usd" }] },
            { title: "Medium / Red", sku: "LEH-RED-M", prices: [{ amount: 1200, currency_code: "usd" }] },
            { title: "Large / Red", sku: "LEH-RED-L", prices: [{ amount: 1250, currency_code: "usd" }] },
          ],
        },
        {
          title: "Pastel Pink Lehenga",
          description:
            "Elegant pastel pink lehenga with delicate floral embroidery. Ideal for engagement parties and daytime events.",
          handle: "pastel-pink-lehenga",
          variants: [
            { title: "Small / Pink", sku: "LEH-PNK-S", prices: [{ amount: 950, currency_code: "usd" }] },
            { title: "Medium / Pink", sku: "LEH-PNK-M", prices: [{ amount: 950, currency_code: "usd" }] },
          ],
        },
        {
          title: "Royal Blue Lehenga",
          description:
            "Regal navy blue lehenga with silver thread work. A statement piece for evening receptions.",
          handle: "royal-blue-lehenga",
          variants: [
            { title: "Medium / Blue", sku: "LEH-BLU-M", prices: [{ amount: 1100, currency_code: "usd" }] },
            { title: "Large / Blue", sku: "LEH-BLU-L", prices: [{ amount: 1100, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Wedding Dresses":
      products.push(
        {
          title: "Ivory Wedding Gown",
          description:
            "Stunning ivory silk wedding gown with hand-beaded bodice and flowing train. Custom stitching available.",
          handle: "ivory-wedding-gown",
          variants: [
            { title: "Small / Ivory", sku: "WDG-IVR-S", prices: [{ amount: 2500, currency_code: "usd" }] },
            { title: "Medium / Ivory", sku: "WDG-IVR-M", prices: [{ amount: 2500, currency_code: "usd" }] },
            { title: "Large / Ivory", sku: "WDG-IVR-L", prices: [{ amount: 2600, currency_code: "usd" }] },
          ],
        },
        {
          title: "Crimson Wedding Saree",
          description:
            "Traditional Banarasi silk wedding saree in deep crimson with heavy gold border. A timeless bridal classic.",
          handle: "crimson-wedding-saree",
          variants: [
            { title: "One Size / Crimson", sku: "WDS-CRM-OS", prices: [{ amount: 1800, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Salwars":
      products.push(
        {
          title: "Anarkali Salwar Set",
          description:
            "Flowing Anarkali-style salwar kameez in soft georgette with subtle sequin work. Comfortable and elegant.",
          handle: "anarkali-salwar-set",
          variants: [
            { title: "Small / Teal", sku: "SLW-ANR-S", prices: [{ amount: 320, currency_code: "usd" }] },
            { title: "Medium / Teal", sku: "SLW-ANR-M", prices: [{ amount: 320, currency_code: "usd" }] },
            { title: "Large / Teal", sku: "SLW-ANR-L", prices: [{ amount: 340, currency_code: "usd" }] },
          ],
        },
        {
          title: "Punjabi Patiala Suit",
          description:
            "Vibrant Patiala salwar with short kurti and dupatta. Perfect for festivals and casual gatherings.",
          handle: "punjabi-patiala-suit",
          variants: [
            { title: "Medium / Orange", sku: "SLW-PAT-M", prices: [{ amount: 180, currency_code: "usd" }] },
            { title: "Large / Orange", sku: "SLW-PAT-L", prices: [{ amount: 180, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Suits":
      products.push(
        {
          title: "Nehru Jacket Suit",
          description:
            "Classic bandhgala suit with Nehru collar in charcoal grey. Perfect for formal occasions and receptions.",
          handle: "nehru-jacket-suit",
          variants: [
            { title: "Medium / Charcoal", sku: "SUT-NEH-M", prices: [{ amount: 450, currency_code: "usd" }] },
            { title: "Large / Charcoal", sku: "SUT-NEH-L", prices: [{ amount: 450, currency_code: "usd" }] },
            { title: "XL / Charcoal", sku: "SUT-NEH-X", prices: [{ amount: 475, currency_code: "usd" }] },
          ],
        },
        {
          title: "Embroidered Sherwani",
          description:
            "Luxurious sherwani in off-white with intricate gold embroidery. The ultimate wedding attire for grooms.",
          handle: "embroidered-sherwani",
          variants: [
            { title: "Medium / Off-White", sku: "SUT-SHR-M", prices: [{ amount: 850, currency_code: "usd" }] },
            { title: "Large / Off-White", sku: "SUT-SHR-L", prices: [{ amount: 850, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Blouses":
      products.push(
        {
          title: "Designer Saree Blouse",
          description:
            "Ready-to-wear designer blouse with intricate back design. Pairs beautifully with any saree.",
          handle: "designer-saree-blouse",
          variants: [
            { title: "Small / Gold", sku: "BLO-DSG-S", prices: [{ amount: 120, currency_code: "usd" }] },
            { title: "Medium / Gold", sku: "BLO-DSG-M", prices: [{ amount: 120, currency_code: "usd" }] },
            { title: "Large / Gold", sku: "BLO-DSG-L", prices: [{ amount: 130, currency_code: "usd" }] },
          ],
        },
        {
          title: "High Neck Blouse",
          description:
            "Elegant high-neck blouse with sheer sleeves and pearl buttons. Modern design for traditional wear.",
          handle: "high-neck-blouse",
          variants: [
            { title: "Small / Black", sku: "BLO-HNK-S", prices: [{ amount: 95, currency_code: "usd" }] },
            { title: "Medium / Black", sku: "BLO-HNK-M", prices: [{ amount: 95, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Kids":
      products.push(
        {
          title: "Kids Lehenga Choli",
          description:
            "Adorable miniature lehenga choli set for little girls. Perfect for weddings and festive occasions.",
          handle: "kids-lehenga-choli",
          variants: [
            { title: "Age 4-6 / Pink", sku: "KID-LCH-4", prices: [{ amount: 150, currency_code: "usd" }] },
            { title: "Age 7-9 / Pink", sku: "KID-LCH-7", prices: [{ amount: 165, currency_code: "usd" }] },
            { title: "Age 10-12 / Pink", sku: "KID-LCH-10", prices: [{ amount: 180, currency_code: "usd" }] },
          ],
        },
        {
          title: "Boys Kurta Pajama",
          description:
            "Handsome kurta pajama set for boys with subtle embroidery. Comfortable cotton blend fabric.",
          handle: "boys-kurta-pajama",
          variants: [
            { title: "Age 4-6 / White", sku: "KID-BKP-4", prices: [{ amount: 85, currency_code: "usd" }] },
            { title: "Age 7-9 / White", sku: "KID-BKP-7", prices: [{ amount: 95, currency_code: "usd" }] },
            { title: "Age 10-12 / White", sku: "KID-BKP-10", prices: [{ amount: 105, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Accessories":
      products.push(
        {
          title: "Silk Dupatta",
          description:
            "Premium silk dupatta with hand-woven border. The perfect accessory to complete any ethnic outfit.",
          handle: "silk-dupatta",
          variants: [
            { title: "One Size / Maroon", sku: "ACC-DUP-MR", prices: [{ amount: 75, currency_code: "usd" }] },
            { title: "One Size / Gold", sku: "ACC-DUP-GD", prices: [{ amount: 85, currency_code: "usd" }] },
          ],
        },
        {
          title: "Potli Bag",
          description:
            "Embellished drawstring potli bag with beadwork. Ideal for carrying essentials at weddings.",
          handle: "potli-bag",
          variants: [
            { title: "One Size / Red", sku: "ACC-POT-RD", prices: [{ amount: 45, currency_code: "usd" }] },
            { title: "One Size / Green", sku: "ACC-POT-GR", prices: [{ amount: 45, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Shoes":
      products.push(
        {
          title: "Bridal Mojari",
          description:
            "Handcrafted leather mojari with intricate bead and mirror work. Traditional Punjabi jutti style.",
          handle: "bridal-mojari",
          variants: [
            { title: "Size 7 / Gold", sku: "SHO-MOJ-7G", prices: [{ amount: 95, currency_code: "usd" }] },
            { title: "Size 8 / Gold", sku: "SHO-MOJ-8G", prices: [{ amount: 95, currency_code: "usd" }] },
            { title: "Size 9 / Gold", sku: "SHO-MOJ-9G", prices: [{ amount: 95, currency_code: "usd" }] },
          ],
        },
        {
          title: "Kolhapuri Chappal",
          description:
            "Authentic vegetable-tanned leather Kolhapuris. Traditional Maharashtrian craftsmanship.",
          handle: "kolhapuri-chappal",
          variants: [
            { title: "Size 8 / Brown", sku: "SHO-KOL-8B", prices: [{ amount: 65, currency_code: "usd" }] },
            { title: "Size 9 / Brown", sku: "SHO-KOL-9B", prices: [{ amount: 65, currency_code: "usd" }] },
            { title: "Size 10 / Brown", sku: "SHO-KOL-10B", prices: [{ amount: 65, currency_code: "usd" }] },
          ],
        }
      );
      break;

    case "Jewellery":
      products.push(
        {
          title: "Kundan Necklace Set",
          description:
            "Traditional Kundan polki necklace with matching earrings and maang tikka. Gold-plated brass base.",
          handle: "kundan-necklace-set",
          variants: [
            { title: "One Size / Gold", sku: "JWL-KUN-OS", prices: [{ amount: 280, currency_code: "usd" }] },
          ],
        },
        {
          title: "Temple Jewellery Set",
          description:
            "South Indian temple jewellery with deity motifs. Perfect for Bharatanatyam and festive wear.",
          handle: "temple-jewellery-set",
          variants: [
            { title: "One Size / Gold", sku: "JWL-TEM-OS", prices: [{ amount: 350, currency_code: "usd" }] },
          ],
        },
        {
          title: "Oxidized Silver Earrings",
          description:
            "Bohemian oxidized silver jhumka earrings with intricate filigree work. Lightweight and versatile.",
          handle: "oxidized-silver-earrings",
          variants: [
            { title: "One Size / Silver", sku: "JWL-OXI-OS", prices: [{ amount: 45, currency_code: "usd" }] },
          ],
        }
      );
      break;

    default:
      break;
  }

  // Add common fields to all products.
  // Every product gets a single "Variant" option derived from its
  // variant titles — Medusa v2 requires variants to map to options.
  return products.map((p) => ({
    ...p,
    options: [
      { title: "Variant", values: p.variants.map((v: any) => v.title) },
    ],
    variants: p.variants.map((v: any) => ({
      ...v,
      manage_inventory: false,
      options: { Variant: v.title },
    })),
    category_ids: [categoryId],
    images: [{ url: IMAGE_PLACEHOLDER }],
    status: "published" as const,
  }));
}

export default async function seedData({ container }: { container: any }) {
  const logger: Logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("🌸 Chaubandi seed starting...");

  // ─── 1. Create Region (United States) ───
  logger.info("Creating region...");
  const regionModuleService = container.resolve(Modules.REGION);
  let region = (
    await regionModuleService.listRegions({ name: "United States" })
  )[0];
  if (!region) {
    const { result: regions } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "United States",
            currency_code: "usd",
            countries: ["us"],
            payment_providers: ["pp_stripe_stripe"],
          },
        ],
      },
    });
    region = regions[0];
  }
  logger.info(`✅ Region: ${region.name} (${region.id})`);

  // ─── 2. Create Sales Channel ───
  logger.info("Creating sales channel...");
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  let salesChannel = (
    await salesChannelModuleService.listSalesChannels({
      name: "Chaubandi Storefront",
    })
  )[0];
  if (!salesChannel) {
    const { result: sales_channels } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Chaubandi Storefront",
            description:
              "Primary sales channel for the Chaubandi Vite storefront",
          },
        ],
      },
    });
    salesChannel = sales_channels[0];
  }
  logger.info(`✅ Sales Channel: ${salesChannel.name} (${salesChannel.id})`);

  // ─── 3. Create Publishable API Key ───
  logger.info("Creating publishable API key...");
  const apiKeyModuleService = container.resolve(Modules.API_KEY);
  let apiKey = (
    await apiKeyModuleService.listApiKeys({
      title: "Chaubandi Storefront Key",
    })
  )[0];
  if (!apiKey) {
    const { result: api_keys } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Chaubandi Storefront Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });
    apiKey = api_keys[0];
  }
  logger.info(`✅ Publishable API Key: ${apiKey.token}`);
  logger.info(
    "⚠️  IMPORTANT: The Vite frontend must send this as x-publishable-api-key header on all /store/* requests"
  );

  // Scope the key to the sales channel — without this link the
  // storefront catalog returns empty.
  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: apiKey.id,
        add: [salesChannel.id],
      },
    });
    logger.info("✅ API key linked to sales channel");
  } catch {
    logger.info("ℹ️  API key already linked to sales channel");
  }

  // ─── 3b. Default Shipping Profile ───
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const existingProfiles = await fulfillmentModuleService.listShippingProfiles(
    { type: "default" }
  );
  let shippingProfile = existingProfiles[0];
  if (!shippingProfile) {
    const { result: profileResult } = await createShippingProfilesWorkflow(
      container
    ).run({
      input: {
        data: [{ name: "Default Shipping Profile", type: "default" }],
      },
    });
    shippingProfile = profileResult[0];
  }
  logger.info(`✅ Shipping profile: ${shippingProfile.name}`);

  // ─── 4. Create Categories ───
  logger.info("Creating product categories...");
  const categoryMap: Record<string, string> = {};
  for (const catName of CATEGORIES) {
    const handle = catName.toLowerCase().replace(/\s+/g, "-");
    let category = (
      await productModuleService.listProductCategories({ handle })
    )[0];
    if (!category) {
      category = await productModuleService.createProductCategories({
        name: catName,
        description: `Chaubandi ${catName} collection`,
        handle,
        is_active: true,
        is_internal: false,
        rank: CATEGORIES.indexOf(catName),
      });
    }
    categoryMap[catName] = category.id;
    logger.info(`   📁 ${catName} (${category.id})`);
  }
  logger.info(`✅ ${CATEGORIES.length} categories created`);

  // ─── 5. Create Sample Products ───
  logger.info("Creating sample products...");
  let productCount = 0;
  for (const catName of CATEGORIES) {
    const products = generateProducts(catName, categoryMap[catName]);
    for (const productInput of products) {
      const existing = await productModuleService.listProducts({
        handle: productInput.handle,
      });
      if (existing.length > 0) {
        continue;
      }
      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              ...productInput,
              sales_channels: [{ id: salesChannel.id }],
              shipping_profile_id: shippingProfile.id,
            },
          ],
        },
      });
      productCount++;
    }
    logger.info(`   📦 ${catName}: ${products.length} products`);
  }
  logger.info(`✅ ${productCount} sample products created`);

  // ─── 6. Create Tax Region ───
  logger.info("Creating US tax region...");
  const taxModuleService = container.resolve(Modules.TAX);
  const existingTaxRegions = await taxModuleService.listTaxRegions({
    country_code: "us",
  });
  if (existingTaxRegions.length === 0) {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: "us",
          provider_id: "tp_system",
          default_tax_rate: {
            name: "US Standard",
            code: "us-standard",
            rate: 6.25, // Massachusetts state tax
          },
        },
      ],
    });
  }
  logger.info("✅ Tax region: United States (6.25%)");

  // ─── 7. Stock Location: Arlington, MA + Fulfillment (shipping & pickup) ───
  logger.info("Creating Arlington, MA stock location + fulfillment...");
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const stockLocationModuleService = container.resolve(
    Modules.STOCK_LOCATION
  );

  const existingLocations =
    await stockLocationModuleService.listStockLocations({
      name: "Chaubandi Arlington Store",
    });
  if (existingLocations.length > 0) {
    logger.info("ℹ️  Arlington stock location already exists — skipping");
  } else {
  const { result: stockLocations } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Chaubandi Arlington Store",
          address: {
            address_1: "Massachusetts Ave",
            city: "Arlington",
            province: "MA",
            postal_code: "02474",
            country_code: "us",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocations[0];

  // Location can fulfill with the built-in manual provider
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });

  // Location serves the storefront sales channel
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  });

  // Fulfillment set 1: shipping (US-wide delivery)
  const shippingFulfillmentSet =
    await fulfillmentModuleService.createFulfillmentSets({
      name: "Chaubandi Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "United States",
          geo_zones: [{ country_code: "us", type: "country" }],
        },
      ],
    });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: shippingFulfillmentSet.id,
    },
  });

  // Fulfillment set 2: in-store pickup (BOPIS)
  const pickupFulfillmentSet =
    await fulfillmentModuleService.createFulfillmentSets({
      name: "Arlington Store Pickup",
      type: "pickup",
      service_zones: [
        {
          name: "Arlington Pickup Zone",
          geo_zones: [{ country_code: "us", type: "country" }],
        },
      ],
    });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: pickupFulfillmentSet.id,
    },
  });

  // Shipping options: standard delivery + free store pickup
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: shippingFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivered in 3-5 business days.",
          code: "standard",
        },
        prices: [
          { currency_code: "usd", amount: 10 },
          { region_id: region.id, amount: 10 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Pick up at our Arlington store",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: pickupFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Store Pickup",
          description:
            "Pick up your order at Chaubandi, Arlington, MA. Free.",
          code: "pickup",
        },
        prices: [
          { currency_code: "usd", amount: 0 },
          { region_id: region.id, amount: 0 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  logger.info(
    "✅ Stock location 'Chaubandi Arlington Store' with delivery + free pickup options"
  );
  } // end stock-location guard

  // ─── Seed Summary ───
  logger.info("");
  logger.info("═══════════════════════════════════════════════");
  logger.info("🌸 Chaubandi seed complete!");
  logger.info("═══════════════════════════════════════════════");
  logger.info(`Region:        ${region.name}`);
  logger.info(`Sales Channel: ${salesChannel.name}`);
  logger.info(`API Key:       ${apiKey.token}`);
  logger.info(`Categories:    ${CATEGORIES.length}`);
  logger.info(`Products:      ${productCount}`);
  logger.info(`Tax:           US 6.25%`);
  logger.info(`Pickup:        Chaubandi Arlington Store (free) + $10 shipping`);
  logger.info("═══════════════════════════════════════════════");
  logger.info("");
  logger.info("👉 Add this to your frontend .env:");
  logger.info(`VITE_MEDUSA_PUBLISHABLE_KEY=${apiKey.token}`);
  logger.info("");
}
