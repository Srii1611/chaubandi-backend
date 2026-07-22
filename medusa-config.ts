import { defineConfig, loadEnv, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const isDev = process.env.NODE_ENV !== "production";

// File module: use R2 when *every* value it needs is present, else local disk.
// All four are required — a partial config used to pass this check and then
// fail at upload time, or silently serve files from an undefined public URL.
const r2Vars = [
  process.env.R2_ACCOUNT_ID,
  process.env.R2_ACCESS_KEY_ID,
  process.env.R2_SECRET_ACCESS_KEY,
  process.env.R2_PUBLIC_URL,
];
const useR2 = r2Vars.every(
  (v) => !!v && !v.includes("replace_me") && !v.includes("your_")
);

if (!useR2 && r2Vars.some((v) => !!v)) {
  console.warn(
    "[chaubandi] R2 is partially configured — falling back to local disk. " +
      "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_URL are all required."
  );
}
if (useR2) {
  // Echo the resolved values (never the keys) so a malformed endpoint or
  // public URL is obvious at boot rather than as an "Invalid URL" from deep
  // inside the AWS SDK on the first upload.
  console.log(
    `[chaubandi] R2 enabled — endpoint ${r2Endpoint()} bucket ${
      process.env.R2_BUCKET_NAME || "chaubandi-uploads"
    } public ${r2PublicUrl()}`
  );
}
if (!useR2 && process.env.NODE_ENV === "production") {
  console.warn(
    "[chaubandi] Using local disk for uploads in production — files are LOST on redeploy. Configure R2."
  );
}

/**
 * Build the R2 S3 endpoint from whatever was pasted into R2_ACCOUNT_ID.
 *
 * Cloudflare's dashboard shows the full "S3 API" URL right next to the
 * account ID, so it is easy to paste the whole thing. Naively interpolating
 * that produced "https://https://<id>.r2.cloudflarestorage.com" and the AWS
 * SDK failed with a bare "Invalid URL" — which says nothing about the cause.
 * Accept either form.
 */
function r2Endpoint(): string {
  const raw = (process.env.R2_ACCOUNT_ID || "").trim().replace(/\/+$/, "");
  // Already a URL, or a bare hostname: keep the host, force https.
  if (raw.includes("://") || raw.includes(".")) {
    const host = raw.replace(/^https?:\/\//, "").split("/")[0];
    return `https://${host}`;
  }
  return `https://${raw}.r2.cloudflarestorage.com`;
}

/** Public bucket URL, tolerating a missing protocol. */
function r2PublicUrl(): string {
  const raw = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

const fileModuleConfig = {
  resolve: "@medusajs/file",
  options: {
    providers: [
      useR2
        ? {
            resolve: "@medusajs/file-s3",
            id: "r2",
            options: {
              file_url: r2PublicUrl(),
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: "auto",
              endpoint: r2Endpoint(),
              bucket: process.env.R2_BUCKET_NAME || "chaubandi-uploads",
            },
          }
        : {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              // Derived from the public URL, not hardcoded: local-provider
              // files are stored with absolute URLs, so a hardcoded localhost
              // here bakes unreachable links into every uploaded file.
              backend_url: `${(
                process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
              ).replace(/\/$/, "")}/static`,
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
