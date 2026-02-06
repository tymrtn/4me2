import { TakeoutCollectionSchema } from "@4me2/schema";
import type {
  TakeoutFeature,
  Review,
  Place,
  AdditionalRating,
  AdditionalInfo,
} from "@4me2/schema";
import { contentHash } from "@4me2/crypto";
import { extractCid } from "./cid.js";

export interface ParseError {
  index: number;
  reason: string;
  feature: TakeoutFeature;
}

export interface ParseResult {
  reviews: Review[];
  errors: ParseError[];
  stats: {
    total: number;
    parsed: number;
    skipped: number;
    withText: number;
    withoutText: number;
  };
}

/**
 * Parse a Google Takeout Reviews.json string into canonical Review objects.
 * Skips reviews with Comment field (incomplete data markers).
 */
export function parseTakeoutReviews(json: string): ParseResult {
  const raw = JSON.parse(json);
  const collection = TakeoutCollectionSchema.parse(raw);

  const reviews: Review[] = [];
  const errors: ParseError[] = [];
  let withText = 0;
  let withoutText = 0;

  for (let i = 0; i < collection.features.length; i++) {
    const feature = collection.features[i];
    const props = feature.properties;

    // Skip incomplete reviews
    if (props.Comment) {
      errors.push({
        index: i,
        reason: `Skipped: ${props.Comment}`,
        feature,
      });
      continue;
    }

    const cid = extractCid(props.google_maps_url);
    if (!cid) {
      errors.push({
        index: i,
        reason: "Could not extract CID from google_maps_url",
        feature,
      });
      continue;
    }

    // Build place identifiers
    const identifiers: Array<{ name: string; value: string }> = [
      { name: "googleCid", value: cid },
      { name: "googleMapsUrl", value: props.google_maps_url },
    ];

    // Build place object
    const place: Place = {
      type: "LocalBusiness",
      name: props.location?.name ?? "Unknown",
      address: props.location?.address,
      geo: {
        // GeoJSON is [lng, lat], schema is [lat, lng]
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
      },
      identifiers,
      countryCode: props.location?.country_code,
    };

    // Map questions to additionalRatings and additionalInfo
    const additionalRatings: AdditionalRating[] = [];
    const additionalInfo: AdditionalInfo[] = [];

    for (const q of props.questions ?? []) {
      if (q.rating !== undefined) {
        additionalRatings.push({
          category: q.question,
          ratingValue: q.rating,
        });
      } else if (q.selected_option !== undefined) {
        additionalInfo.push({
          question: q.question,
          answer: q.selected_option,
        });
      }
    }

    // Build review without reviewId (needed for hashing)
    const reviewData = {
      itemReviewed: place,
      reviewRating: {
        ratingValue: props.five_star_rating_published,
        bestRating: 5,
      },
      ...(props.review_text_published
        ? { reviewBody: props.review_text_published }
        : {}),
      datePublished: props.date,
      additionalRatings,
      additionalInfo,
    };

    // Compute content hash and build final review
    const reviewId = contentHash(reviewData);
    const review: Review = { reviewId, ...reviewData };

    reviews.push(review);

    if (props.review_text_published) {
      withText++;
    } else {
      withoutText++;
    }
  }

  return {
    reviews,
    errors,
    stats: {
      total: collection.features.length,
      parsed: reviews.length,
      skipped: errors.length,
      withText,
      withoutText,
    },
  };
}
