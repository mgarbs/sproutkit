import { z } from 'zod';
import { SourceSchema } from './source.js';

const phRange = z.tuple([z.number(), z.number()]).refine(
  ([lo, hi]) => lo > 0 && hi <= 14 && lo <= hi,
  { message: 'ph must be a [low, high] pair in (0, 14] with low <= high' },
);

const dayRange = z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(
  ([lo, hi]) => lo <= hi,
  { message: 'days_to_maturity low must be <= high' },
);

export const SowingSchema = z.object({
  indoors_weeks_before_last_frost: z.number().int().min(0).max(20).optional(),
  direct_sow: z.boolean().optional(),
  transplant_after_last_frost_weeks: z.number().int().min(-12).max(20).optional(),
}).partial();

export const PlantSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  common_names: z.array(z.string().min(1)).min(1),
  scientific_name: z.string().min(1),
  category: z.enum([
    'vegetable',
    'fruit',
    'herb',
    'flower',
    'tree',
    'shrub',
    'grain',
    'cover-crop',
  ]),
  lifecycle: z.enum(['annual', 'biennial', 'perennial']),
  climate: z.object({
    usda_zones: z.array(z.number().int().min(1).max(13)).min(1),
    koppen: z.array(z.string()).optional(),
    frost_tolerance: z.enum(['none', 'light', 'hard']),
  }),
  sun: z.enum(['full', 'partial', 'shade']),
  water: z.enum(['low', 'medium', 'high']),
  soil: z.object({
    ph: phRange,
    drainage: z.enum(['well', 'moderate', 'poor']),
  }),
  spacing_cm: z.number().positive().optional(),
  days_to_maturity: dayRange.optional(),
  sowing: SowingSchema.optional(),
  companions: z.object({
    good: z.array(z.string()).default([]),
    bad: z.array(z.string()).default([]),
  }).partial().optional(),
  common_issues: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).min(1, 'every plant must cite at least one source'),
});

export type Plant = z.infer<typeof PlantSchema>;
