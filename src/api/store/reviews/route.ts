import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /store/reviews
 * Public route — returns the boutique's live Google rating, total review count,
 * and up to 5 featured reviews via the Google Places API (New).
 *
 * Cost: free. Results are cached for 12h, so this makes ~2 Google calls/day,
 * far inside Google Maps Platform's monthly free credit.
 *
 * Needs in .env:  GOOGLE_PLACES_API_KEY  and  GOOGLE_PLACE_ID
 * Until those are set it returns { configured: false } and the storefront
 * falls back to its curated reviews.
 */

// Module-level cache (per server process) — keeps us within the free tier.
let cache: { at: number; data: any } | null = null;
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId || apiKey.includes("your_") ) {
    return res.status(200).json({ configured: false, rating: null, total: null, reviews: [] });
  }

  if (cache && Date.now() - cache.at < TTL_MS) {
    return res.json({ configured: true, cached: true, ...cache.data });
  }

  try {
    const resp = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          // Ask only for what we render — keeps the request on the cheapest SKU.
          "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
        },
      }
    );

    if (!resp.ok) {
      const body = await resp.text();
      console.error("[reviews] Google Places API error:", resp.status, body);
      // Serve stale cache if we have it; otherwise an empty (fallback) payload.
      if (cache) return res.json({ configured: true, cached: true, stale: true, ...cache.data });
      return res.status(200).json({ configured: true, error: true, rating: null, total: null, reviews: [] });
    }

    const data: any = await resp.json();
    const reviews = (data.reviews || []).map((r: any) => ({
      author: r.authorAttribution?.displayName || "Google user",
      photo: r.authorAttribution?.photoUri || null,
      profileUrl: r.authorAttribution?.uri || null,
      rating: r.rating || 5,
      text: r.text?.text || r.originalText?.text || "",
      time: r.relativePublishTimeDescription || "",
    }));

    const payload = {
      rating: typeof data.rating === "number" ? data.rating : null,
      total: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      googleUrl: data.googleMapsUri || null,
      reviews,
    };

    cache = { at: Date.now(), data: payload };
    res.json({ configured: true, cached: false, ...payload });
  } catch (error: any) {
    console.error("[reviews] Failed to fetch Google reviews:", error.message);
    if (cache) return res.json({ configured: true, cached: true, stale: true, ...cache.data });
    res.status(200).json({ configured: true, error: true, rating: null, total: null, reviews: [] });
  }
}
