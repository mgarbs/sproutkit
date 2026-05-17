import { z } from 'zod';

import { AffiliateTargetSchema } from './affiliate.js';
import { SourceSchema } from './source.js';
import { PlantTagSchema } from './tags.js';

export const ProductCategorySchema = z.enum([
  'tool',
  'soil',
  'seed',
  'amendment',
  'hardware',
  'container',
  'cover',
  'irrigation',
  'book',
]);
export type ProductCategory = z.infer<typeof ProductCategorySchema>;

/**
 * A SproutKit product entry — a SKU + WHY it's recommended.
 *
 * Hard constraints (enforced by schema or CI):
 *  - sources: min 2 enforced in CONTRIBUTING; schema enforces min 1 as a floor.
 *  - No price / rating / image fields — Amazon's Operating Agreement forbids
 *    offline caching of those beyond 24h, so they don't belong in a git-tracked
 *    dataset. The schema's .strict() blocks them.
 *  - At least one affiliate_target. The deployment supplies its own tag via env;
 *    the dataset never embeds a real tag — url_template must contain {tag}.
 *  - tags are constrained to the PlantTag vocabulary so the matcher works.
 */
export const ProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  name: z.string().min(1),
  category: ProductCategorySchema,
  tags: z.array(PlantTagSchema).min(1),
  affiliate_targets: z.array(AffiliateTargetSchema).min(1),
  notes: z.string().optional(),
  sources: z.array(SourceSchema).min(1, 'every product must cite at least one source for why this category helps'),
}).strict();

export type Product = z.infer<typeof ProductSchema>;
