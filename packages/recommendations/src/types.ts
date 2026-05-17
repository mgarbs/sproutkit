import { z } from 'zod';

import { PlantTagSchema } from '@sproutkit/schema';

/**
 * Intent levels that govern whether and how aggressively a tool emits
 * recommendations. Declared once per tool when it's registered.
 *
 *  - 'lookup'           — pure information lookup (e.g. get_plant). No
 *                          recommendations unless the request explicitly
 *                          opts in via explicit_product_slugs.
 *  - 'product-adjacent' — informational but purchase-relevant (e.g. a
 *                          seasonal-planting calendar). Tag-overlap match,
 *                          capped at 3.
 *  - 'purchase-implied' — the question is fundamentally "what should I
 *                          buy" (e.g. an amendment recommender). Tag-overlap
 *                          match, capped at 5.
 *  - 'playbook'         — curated build/how-to (e.g. raised-bed playbook).
 *                          Uses explicit_product_slugs from the playbook;
 *                          tag-overlap as fallback. Cap 5.
 */
export const RecommendationIntentSchema = z.enum([
  'lookup',
  'product-adjacent',
  'purchase-implied',
  'playbook',
]);
export type RecommendationIntent = z.infer<typeof RecommendationIntentSchema>;

export const RecommendationContextSchema = z.object({
  intent: RecommendationIntentSchema,
  tags: z.array(PlantTagSchema).default([]),
  plant_slugs: z.array(z.string()).default([]),
  explicit_product_slugs: z.array(z.string()).default([]),
});
export type RecommendationContext = z.infer<typeof RecommendationContextSchema>;

export const RecommendationSchema = z.object({
  product_slug: z.string(),
  name: z.string(),
  category: z.string(),
  url: z.string().url(),
  network: z.string(),
  rationale: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().url().optional(),
    publisher: z.string().optional(),
  })),
  affiliate: z.literal(true),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;
