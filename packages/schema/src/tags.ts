import { z } from 'zod';

/**
 * Controlled vocabulary of tags used by both Plants and Products to
 * power tag-overlap matching in the recommendation engine.
 *
 * Add tags deliberately. A junk-drawer of synonyms ("tomato" vs "tomatoes"
 * vs "solanum") kills matching precision. When in doubt, prefer the most
 * common gardener-facing term and let aliases live on the entity's
 * `common_names` instead.
 *
 * Categories below are organizational only — they don't appear in code.
 */
export const PLANT_TAGS = [
  // Botanical families / groups
  'solanaceae',
  'cucurbit',
  'brassica',
  'allium',
  'legume',
  'asteraceae',
  'apiaceae',
  'amaranthaceae',
  'lamiaceae',

  // Common crops (gardener-facing)
  'tomato',
  'pepper',
  'cucumber',
  'squash',
  'zucchini',
  'lettuce',
  'kale',
  'cabbage',
  'broccoli',
  'carrot',
  'beet',
  'onion',
  'garlic',
  'bean',
  'pea',
  'basil',
  'herb',
  'leafy-green',
  'root-vegetable',

  // Lifecycle / season
  'cool-season',
  'warm-season',
  'frost-tender',
  'frost-hardy',
  'overwintering',
  'spring-planting',
  'summer-planting',
  'fall-planting',

  // Garden form / infrastructure
  'raised-bed',
  'container',
  'in-ground',
  'cold-frame',
  'hoop-house',
  'greenhouse',
  'trellis',
  'cage',
  'mulch',
  'cover-crop',

  // Inputs / care
  'drip-irrigation',
  'soaker-hose',
  'fertilizer',
  'compost',
  'soil-amendment',
  'ph-adjustment',
  'seed-starting',
  'transplant',

  // Problems
  'pest-pressure',
  'fungal-disease',
  'calcium-deficiency',
  'nitrogen-deficiency',
  'pollination',
] as const;

export const PlantTagSchema = z.enum(PLANT_TAGS);
export type PlantTag = z.infer<typeof PlantTagSchema>;
