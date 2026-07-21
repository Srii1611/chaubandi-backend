import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const isDev = process.env.NODE_ENV !== "production";

// File module: use R2 if credentials provided, else local storage
const useR2 =
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  !process.env.R2_ACCOUNT_ID.includes("replace_me");

const fileModuleConfig = {
  resolve: "@medusajs/file",
  options: {
    providers: [
      useR2
        ? {
            resolve: "@medusajs/file-s3",
            id: "r2",
            options: {
              file_url: process.env.R2_PUBLIC_URL,
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: "auto",
              endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              bucket: process.env.R2_BUCKET_NAME || "chaubandi-uploads",
            },
          }
        : {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: "http://localhost:9000/static",
            },
          },
    ],
  },
};

const stripeConfigured =
  !!process.env.STRIPE_API_KEY &&
  process.env.STRIPE_API_KEY.startsWith("sk_") &&
  !process.env.STRIPE_API_KEY.includes("replace_me") &&
  !process.env.STRIPE_API_KEY.includes("your_");

if (!stripeConfigured) {
  console.warn(
    "[chaubandi] STRIPE_API_KEY not set — the Stripe payment provider is disabled."
  );
}

// Notification: SendGrid when a real key is present, otherwise Medusa's local
// provider, which logs the full email to the console. The backend must run —
// and every subscriber must fire — with no credentials at all.
const sendgridConfigured =
  !!process.env.SENDGRID_API_KEY &&
  process.env.SENDGRID_API_KEY.startsWith("SG.") &&
  !process.env.SENDGRID_API_KEY.includes("replace_me") &&
  !process.env.SENDGRID_API_KEY.includes("your_");

if (!sendgridConfigured) {
  console.warn(
    "[chaubandi] SENDGRID_API_KEY not set — emails will be logged to the console instead of sent."
  );
}

const notificationProvider = sendgridConfigured
  ? {
      resolve: "@medusajs/notification-sendgrid",
      id: "sendgrid",
      options: {
        channels: ["email"],
        apiKey: process.env.SENDGRID_API_KEY,
        from: process.env.SENDGRID_FROM_EMAIL || "chaubandi@example.com",
      },
    }
  : {
      resolve: "@medusajs/notification-local",
      id: "local",
      options: {
        channels: ["email"],
        from: process.env.SENDGRID_FROM_EMAIL || "chaubandi@example.com",
      },
    };

// Redis is optional. With REDIS_URL set we get a shared event bus, cache and
// lock (required for multi-instance deploys); without it Medusa's in-memory
// equivalents are used, which is fine for local dev and a single instance.
const redisUrl = process.env.REDIS_URL;
const redisModules: Record<string, any> = redisUrl
  ? {
      [Modules.EVENT_BUS]: {
        resolve: "@medusajs/event-bus-redis",
        options: { redisUrl },
      },
      [Modules.CACHE]: {
        resolve: "@medusajs/cache-redis",
        options: { redisUrl },
      },
      [Modules.LOCKING]: {
        resolve: "@medusajs/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: { redisUrl },
            },
          ],
        },
      },
    }
  : {};

// Comma-separated origin lists. Defaults cover the local Vite storefront and
// the local admin; production values come from the environment.
const corsDefault = "http://localhost:5173,http://localhost:3000";

module.exports = defineConfig({
  projectConfig: {
    // CHAUBANDI_DATABASE_URL takes precedence: a machine-level DATABASE_URL
    // env var (e.g. from another project) would silently override .env,
    // since dotenv never overwrites existing process env vars.
    databaseUrl: (process.env.CHAUBANDI_DATABASE_URL ||
      process.env.DATABASE_URL)!,
    redisUrl,
    http: {
      storeCors: process.env.STORE_CORS || corsDefault,
      adminCors:
        process.env.ADMIN_CORS || `${corsDefault},http://localhost:9000`,
      authCors: process.env.AUTH_CORS || `${corsDefault},http://localhost:9000`,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  modules: {
    ...redisModules,
    appointments: {
      resolve: "./src/modules/appointments",
    },
    measurements: {
      resolve: "./src/modules/measurements",
    },
    product_reviews: {
      resolve: "./src/modules/product-reviews",
    },
    [Modules.PAYMENT]: {
      resolve: "@medusajs/payment",
      options: {
        // Stripe is only registered with a real key. Without one the module
        // still loads (so carts and orders work) — checkout falls back to the
        // system provider and the appointment routes return a clean 503
        // `payments_not_configured`.
        providers: stripeConfigured
          ? [
              {
                resolve: "@medusajs/payment-stripe",
                id: "stripe",
                options: {
                  apiKey: process.env.STRIPE_API_KEY,
                  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                },
              },
            ]
          : [],
      },
    },
    [Modules.NOTIFICATION]: {
      resolve: "@medusajs/notification",
      options: {
        providers: [notificationProvider],
      },
    },
    [Modules.FILE]: fileModuleConfig,
  },
});
