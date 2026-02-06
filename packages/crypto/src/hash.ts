import { sha256 } from "@noble/hashes/sha256";
import type { Review } from "@4me2/schema";

/**
 * Compute a deterministic content hash for a review.
 * Uses sorted-key JSON stringification + SHA-256.
 * Returns "sha256:{hex}" format.
 */
export function contentHash(
  review: Omit<Review, "reviewId">,
): string {
  const canonical = JSON.stringify(sortKeys(review));
  const hash = sha256(new TextEncoder().encode(canonical));
  const hex = Buffer.from(hash).toString("hex");
  return `sha256:${hex}`;
}

/** Recursively sort object keys for deterministic serialization. */
function sortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}
