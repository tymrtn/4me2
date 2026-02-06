import { z } from "zod";

/**
 * Google Takeout GeoJSON schema for Maps reviews.
 * Confirmed from real export data (103 reviews, 2018-2026).
 */

export const TakeoutQuestionSchema = z.object({
  question: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
  selected_option: z.string().optional(),
});

export type TakeoutQuestion = z.infer<typeof TakeoutQuestionSchema>;

export const TakeoutLocationSchema = z.object({
  name: z.string(),
  address: z.string(),
  country_code: z.string().length(2).optional(),
});

export type TakeoutLocation = z.infer<typeof TakeoutLocationSchema>;

export const TakeoutPropertiesSchema = z.object({
  date: z.string().datetime({ offset: true }),
  five_star_rating_published: z.number().int().min(1).max(5),
  google_maps_url: z.string().url(),
  location: TakeoutLocationSchema.optional(),
  review_text_published: z.string().optional(),
  questions: z.array(TakeoutQuestionSchema).optional(),
  Comment: z.string().optional(),
});

export type TakeoutProperties = z.infer<typeof TakeoutPropertiesSchema>;

export const TakeoutFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
  }),
  properties: TakeoutPropertiesSchema,
});

export type TakeoutFeature = z.infer<typeof TakeoutFeatureSchema>;

export const TakeoutCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(TakeoutFeatureSchema),
});

export type TakeoutCollection = z.infer<typeof TakeoutCollectionSchema>;
