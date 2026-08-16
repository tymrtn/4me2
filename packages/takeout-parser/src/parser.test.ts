import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseTakeoutReviews, extractCid } from "./index.js";

// Synthetic fixture in the real Google Takeout Reviews.json shape:
// 4 features — one with sub-rating questions, one with a selected_option
// question, one rating-only, one marked skipped via the Comment field.
const TAKEOUT_PATH = fileURLToPath(
  new URL("../../../fixtures/sample-takeout.json", import.meta.url),
);

describe("extractCid", () => {
  it("extracts CID from a standard Maps URL", () => {
    const url =
      "https://www.google.com/maps/place//data=!4m2!3m1!1s0x0:0xee78edee1214fa1f";
    expect(extractCid(url)).toBe("0xee78edee1214fa1f");
  });

  it("returns null for invalid URLs", () => {
    expect(extractCid("https://example.com")).toBeNull();
    expect(extractCid("")).toBeNull();
  });
});

describe("parseTakeoutReviews", () => {
  it("parses the fixture export", () => {
    const json = readFileSync(TAKEOUT_PATH, "utf-8");
    const result = parseTakeoutReviews(json);

    expect(result.stats.total).toBe(4);
    expect(result.stats.parsed).toBe(3);
    expect(result.stats.skipped).toBe(1); // the review with a Comment field
    expect(result.stats.withText).toBe(2);
    expect(result.stats.withoutText).toBe(1);
    expect(result.reviews.length).toBe(result.stats.parsed);
    expect(result.errors.length).toBe(result.stats.skipped);
  });

  it("produces valid review objects", () => {
    const json = readFileSync(TAKEOUT_PATH, "utf-8");
    const result = parseTakeoutReviews(json);

    for (const review of result.reviews) {
      // Every review has a content hash
      expect(review.reviewId).toMatch(/^sha256:[0-9a-f]{64}$/);
      // Every review has a place
      expect(review.itemReviewed.name).toBeTruthy();
      // Every review has coordinates
      expect(review.itemReviewed.geo).toBeDefined();
      expect(review.itemReviewed.geo!.latitude).toBeGreaterThan(-90);
      expect(review.itemReviewed.geo!.latitude).toBeLessThan(90);
      // Every review has a CID identifier
      const cidId = review.itemReviewed.identifiers.find(
        (id) => id.name === "googleCid",
      );
      expect(cidId).toBeDefined();
      expect(cidId!.value).toMatch(/^0x[a-f0-9]+$/);
      // Rating in range
      expect(review.reviewRating.ratingValue).toBeGreaterThanOrEqual(1);
      expect(review.reviewRating.ratingValue).toBeLessThanOrEqual(5);
    }
  });

  it("captures sub-ratings correctly", () => {
    const json = readFileSync(TAKEOUT_PATH, "utf-8");
    const result = parseTakeoutReviews(json);

    const withSubRatings = result.reviews.filter(
      (r) => r.additionalRatings.length > 0,
    );
    expect(withSubRatings.length).toBe(1);

    // Check categories are mapped correctly
    const allCategories = new Set(
      withSubRatings.flatMap((r) =>
        r.additionalRatings.map((ar) => ar.category),
      ),
    );
    expect(allCategories.has("Food")).toBe(true);
    expect(allCategories.has("Service")).toBe(true);
    expect(allCategories.has("Atmosphere")).toBe(true);
  });

  it("captures additional info (price, meal type)", () => {
    const json = readFileSync(TAKEOUT_PATH, "utf-8");
    const result = parseTakeoutReviews(json);

    const withInfo = result.reviews.filter(
      (r) => r.additionalInfo.length > 0,
    );
    expect(withInfo.length).toBe(1);

    const allQuestions = new Set(
      withInfo.flatMap((r) => r.additionalInfo.map((ai) => ai.question)),
    );
    expect(allQuestions.has("Price per person")).toBe(true);
  });

  it("produces deterministic content hashes", () => {
    const json = readFileSync(TAKEOUT_PATH, "utf-8");
    const result1 = parseTakeoutReviews(json);
    const result2 = parseTakeoutReviews(json);

    for (let i = 0; i < result1.reviews.length; i++) {
      expect(result1.reviews[i].reviewId).toBe(result2.reviews[i].reviewId);
    }
  });

  it("all content hashes are unique", () => {
    const json = readFileSync(TAKEOUT_PATH, "utf-8");
    const result = parseTakeoutReviews(json);
    const hashes = new Set(result.reviews.map((r) => r.reviewId));
    expect(hashes.size).toBe(result.reviews.length);
  });
});
