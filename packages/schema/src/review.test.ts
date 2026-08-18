import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TakeoutCollectionSchema, ReviewSchema } from "./index.js";

// Synthetic fixture in the real Google Takeout Reviews.json shape.
const TAKEOUT_PATH = fileURLToPath(
  new URL("../../../fixtures/sample-takeout.json", import.meta.url),
);

describe("TakeoutCollectionSchema", () => {
  it("parses a Takeout-shaped Reviews.json", () => {
    const raw = JSON.parse(readFileSync(TAKEOUT_PATH, "utf-8"));
    const result = TakeoutCollectionSchema.safeParse(raw);

    if (!result.success) {
      console.error(result.error.issues.slice(0, 5));
    }
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features.length).toBe(4);
      expect(result.data.type).toBe("FeatureCollection");
    }
  });

  it("extracts CID from every review URL", () => {
    const raw = JSON.parse(readFileSync(TAKEOUT_PATH, "utf-8"));
    const collection = TakeoutCollectionSchema.parse(raw);
    const cidRegex = /1s0x0:0x([a-f0-9]+)/;

    for (const feature of collection.features) {
      const match = feature.properties.google_maps_url.match(cidRegex);
      expect(match).not.toBeNull();
      expect(match![1].length).toBeGreaterThan(0);
    }
  });
});

describe("ReviewSchema", () => {
  it("validates a canonical review object", () => {
    const review = {
      reviewId: "sha256:abc123def456",
      itemReviewed: {
        name: "DopiCo Specialty Coffee",
        address: "C. de Ferraz, 36, Madrid",
        geo: { latitude: 40.4262536, longitude: -3.7169153 },
        identifiers: [
          { name: "googleCid", value: "0xee78edee1214fa1f" },
        ],
        countryCode: "ES",
      },
      reviewRating: { ratingValue: 5, bestRating: 5 },
      reviewBody: "My fav local cafe",
      datePublished: "2026-01-13T12:42:41.911551Z",
      additionalRatings: [
        { category: "Food", ratingValue: 5 },
        { category: "Service", ratingValue: 5 },
      ],
      additionalInfo: [
        { question: "Price per person", answer: "€20–30" },
      ],
    };

    const result = ReviewSchema.safeParse(review);
    expect(result.success).toBe(true);
  });

  it("allows reviews without text (rating-only)", () => {
    const review = {
      reviewId: "sha256:abc123",
      itemReviewed: { name: "Some Place" },
      reviewRating: { ratingValue: 4, bestRating: 5 },
      datePublished: "2025-01-01T00:00:00Z",
    };

    const result = ReviewSchema.safeParse(review);
    expect(result.success).toBe(true);
  });
});
