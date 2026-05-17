import { z } from 'zod';

import { SourceSchema } from './source.js';
import { PlantTagSchema } from './tags.js';

export const PlaybookCategorySchema = z.enum([
  'build',
  'plant',
  'harvest',
  'season-extension',
  'amendment',
]);
export type PlaybookCategory = z.infer<typeof PlaybookCategorySchema>;

export const PlaybookDifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
]);
export type PlaybookDifficulty = z.infer<typeof PlaybookDifficultySchema>;

export const PlaybookStepSchema = z.object({
  heading: z.string().min(1).max(120),
  body: z.string().min(1),
}).strict();
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;

/**
 * A SproutKit playbook — a curated how-to bundle.
 *
 * Playbooks are the highest-intent surface in the system: they're how-to
 * guides where readers ARE buying things. The `recommended_products` field
 * is the curated SKU bundle (slugs into data/products) that
 * `get_playbook`'s handler passes as `ctx.explicit_product_slugs` to the
 * recommender. Tag-overlap is the fallback; curation is the primary signal.
 */
export const PlaybookSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  title: z.string().min(1).max(120),
  topic: z.string().min(1).max(160).describe('Short matchable phrase, e.g. "raised garden bed"'),
  category: PlaybookCategorySchema,
  difficulty: PlaybookDifficultySchema,
  time_estimate: z.string().min(1),
  tags: z.array(PlantTagSchema).min(1),
  steps: z.array(PlaybookStepSchema).min(2),
  recommended_products: z.array(z.string()).default([]),
  related_plant_slugs: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).min(2, 'playbooks must cite at least two sources'),
}).strict();

export type Playbook = z.infer<typeof PlaybookSchema>;
