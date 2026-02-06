import { z } from "zod";

/**
 * Canonical 4me2 review schema.
 * Maps to schema.org/Review inside a JWT-VC envelope.
 */

export const PlaceIdentifierSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const PlaceSchema = z.object({
  /** schema.org @type */
  type: z.string().default("LocalBusiness"),
  /** Business/place name */
  name: z.string(),
  /** Full street address */
  address: z.string().optional(),
  /** Coordinates */
  geo: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  /** External identifiers: googleCid, googlePlaceId, googleMapsUrl, etc. */
  identifiers: z.array(PlaceIdentifierSchema).default([]),
  /** ISO 3166-1 alpha-2 country code */
  countryCode: z.string().length(2).optional(),
});

export type Place = z.infer<typeof PlaceSchema>;

export const RatingSchema = z.object({
  ratingValue: z.number().int().min(1).max(5),
  bestRating: z.number().int().default(5),
});

export type Rating = z.infer<typeof RatingSchema>;

export const AdditionalRatingSchema = z.object({
  category: z.string(),
  ratingValue: z.number().int().min(1).max(5),
});

export type AdditionalRating = z.infer<typeof AdditionalRatingSchema>;

export const AdditionalInfoSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export type AdditionalInfo = z.infer<typeof AdditionalInfoSchema>;

export const LicenseTierSchema = z.enum(["display", "summarize", "train"]);

export type LicenseTier = z.infer<typeof LicenseTierSchema>;

export const ReviewSchema = z.object({
  /** SHA-256 content hash, prefixed with "sha256:" */
  reviewId: z.string().startsWith("sha256:"),
  /** The place being reviewed */
  itemReviewed: PlaceSchema,
  /** Overall star rating */
  reviewRating: RatingSchema,
  /** Review text (optional — some reviews are rating-only) */
  reviewBody: z.string().optional(),
  /** ISO 8601 datetime when originally published */
  datePublished: z.string().datetime({ offset: true }),
  /** Sub-category ratings (Food, Service, Atmosphere, etc.) */
  additionalRatings: z.array(AdditionalRatingSchema).default([]),
  /** Structured answers (Price per person, Meal type, etc.) */
  additionalInfo: z.array(AdditionalInfoSchema).default([]),
});

export type Review = z.infer<typeof ReviewSchema>;

/**
 * The full JWT-VC credential subject wrapping a Review.
 * This is the `vc.credentialSubject` in the signed JWT.
 */
export const ReviewCredentialSchema = z.object({
  "@context": z.array(z.string()).default([
    "https://www.w3.org/ns/credentials/v2",
    "https://schema.org",
  ]),
  type: z
    .array(z.string())
    .default(["VerifiableCredential", "ReviewCredential"]),
  credentialSubject: ReviewSchema.extend({
    "@type": z.string().default("Review"),
  }),
});

export type ReviewCredential = z.infer<typeof ReviewCredentialSchema>;
