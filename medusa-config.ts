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

module.exports = defineConfig({
  projectConfig: {
    // CHAUBANDI_DATABASE_URL takes precedence: a machine-level DATABASE_URL
    // env var (e.g. from another project) would silently override .env,
    // since dotenv never overwrites existing process env vars.
    databaseUrl: (process.env.CHAUBANDI_DATABASE_URL ||
      process.env.DATABASE_URL)!,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: "http://localhost:9000",
  },
  modules: {
    appointments: {
      resolve: "./src/modules/appointments",
    },
    measurements: {
      resolve: "./src/modules/measurements",
    },
    [Modules.PAYMENT]: {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
      },
    },
    [Modules.NOTIFICATION]: {
      resolve: "@medusajs/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/notification-sendgrid",
            id: "sendgrid",
            options: {
              channels: ["email"],
              apiKey: process.env.SENDGRID_API_KEY,
              from: process.env.SENDGRID_FROM_EMAIL || "chaubandi@example.com",
            },
          },
        ],
      },
    },
    [Modules.FILE]: fileModuleConfig,
  },
});
