import {
  defineMiddlewares,
  authenticate,
  type MedusaRequest,
  type MedusaResponse,
  type MedusaNextFunction,
} from "@medusajs/framework/http";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
});

// Wrap multer so its own errors (file too large, too many files, wrong field
// name) return a clean 4xx with a helpful message instead of bubbling up to
// Medusa's default error handler as an opaque 500 — these are client errors.
const uploadInspirationImages = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  upload.array("files", 5)(req as any, res as any, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      // 413 Payload Too Large for oversized files, 400 for everything else
      // (too many files, unexpected field, etc.).
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res
        .status(status)
        .json({ message: `Upload error: ${err.message}.` });
    }
    if (err) {
      return next(err as Error);
    }
    return next();
  });
};

/**
 * Global API Middleware
 * - CORS is handled by projectConfig in medusa-config.ts
 * - Admin routes (/admin/*) are protected by Medusa's built-in auth
 * - Custom store routes that act on behalf of a customer require
 *   an authenticated customer session or bearer token.
 * - /store/appointments/slots stays public (browsable before login).
 */
export default defineMiddlewares({
  routes: [
    // Exact-match regexes: string matchers are prefix-based, which would
    // wrongly require auth on the public /store/appointments/slots route.
    {
      matcher: /^\/store\/appointments$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: /^\/store\/appointments\/pay(\/confirm)?$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: /^\/store\/measurements$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      // Canonical measurements path (the one above is the legacy alias).
      matcher: /^\/store\/customers\/me\/measurements$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: /^\/store\/inspiration$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      // Plain string matcher (not a regex) so multer actually binds — this
      // mirrors Medusa's own /admin/uploads route. The regex trick used above
      // is only needed to avoid prefix-matching a public sub-route; /store/uploads
      // has no sub-paths, so a string matcher is both correct and required here
      // (Medusa stringifies regex matchers, which then fail to match the path).
      matcher: "/store/uploads",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        uploadInspirationImages,
      ],
    },
  ],
});
