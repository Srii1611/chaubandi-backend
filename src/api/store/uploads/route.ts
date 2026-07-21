import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/uploads
 * Customer-facing file upload for the "Design Your Dream Outfit"
 * inspiration flow. Accepts multipart/form-data with a `files` field
 * (up to 5 images, 10MB each). Stores via the configured File Module
 * provider (local in dev, Cloudflare R2 in production) and returns
 * the public URLs — the client then passes a URL as `image_url` to
 * POST /store/inspiration.
 *
 * Auth: requires a logged-in customer (enforced in middlewares.ts,
 * alongside the multer middleware that populates req.files).
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const files = (req as unknown as { files?: Express.Multer.File[] }).files;
  if (!files || files.length === 0) {
    return res.status(400).json({
      message:
        "No files uploaded. Send multipart/form-data with a 'files' field.",
    });
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(415).json({
        message: `Unsupported file type '${file.mimetype}'. Allowed: JPEG, PNG, WebP, HEIC.`,
      });
    }
  }

  const fileModuleService = req.scope.resolve(Modules.FILE);

  try {
    const created = await fileModuleService.createFiles(
      files.map((file) => ({
        // Flat filename (local provider can't create subdirectories).
        // Prefix ties the file to the customer + purpose for later cleanup.
        filename: `inspiration-${customerId}-${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, "_")}`,
        mimeType: file.mimetype,
        // CreateFileDTO.content is a base64-encoded string in v2.17.2 — the
        // file provider round-trips it through Buffer.from(content, "base64").
        // Passing a raw binary string would fail that check and get re-encoded
        // as UTF-8, corrupting any byte >= 0x80 (i.e. real image data).
        content: file.buffer.toString("base64"),
        access: "public",
      }))
    );

    return res.status(201).json({
      files: created.map((f) => ({ id: f.id, url: f.url })),
    });
  } catch (e) {
    console.error("[store/uploads] File upload failed:", e);
    return res.status(500).json({
      message: "Upload failed. Please try again.",
    });
  }
}
