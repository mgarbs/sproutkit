/**
 * get_plant — look up a single plant by slug or by name (common or scientific).
 *
 * Returns the full validated Plant on hit, or a structured not-found result
 * carrying the closest 3 candidate names so the caller can refine.
 */

import type { Plant } from '@sproutkit/schema';
import { z } from 'zod';

import type { PlantIndex } from '../data-loader.js';

export const getPlantInputShape = {
  slug: z.string().optional().describe('Exact slug, e.g. "tomato-brandywine".'),
  name: z
    .string()
    .optional()
    .describe('A common or scientific name. Case-insensitive. Used when slug is not provided.'),
} as const;

const InputSchema = z.object(getPlantInputShape).refine(
  (v) => Boolean(v.slug ?? v.name),
  { message: 'Provide either slug or name.' },
);

export type GetPlantInput = z.infer<typeof InputSchema>;

export type GetPlantResult =
  | { ok: true; plant: Plant }
  | { ok: false; error: 'not_found'; query: string; candidates: string[] };

function distance(a: string, b: string): number {
  // Tiny Levenshtein — fine for ~hundreds of plants, deferred optimization later.
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
      prev = tmp;
    }
  }
  return dp[n]!;
}

function nearestCandidates(query: string, index: PlantIndex, k = 3): string[] {
  const q = query.toLowerCase();
  const seen = new Set<string>();
  const ranked: { name: string; d: number }[] = [];
  for (const plant of index.all) {
    for (const name of [plant.scientific_name, ...plant.common_names, plant.slug]) {
      if (seen.has(name)) continue;
      seen.add(name);
      ranked.push({ name, d: distance(q, name.toLowerCase()) });
    }
  }
  ranked.sort((a, b) => a.d - b.d);
  return ranked.slice(0, k).map((r) => r.name);
}

export function getPlant(input: GetPlantInput, index: PlantIndex): GetPlantResult {
  const parsed = InputSchema.parse(input);

  if (parsed.slug) {
    const hit = index.bySlug.get(parsed.slug);
    if (hit) return { ok: true, plant: hit };
    return {
      ok: false,
      error: 'not_found',
      query: parsed.slug,
      candidates: nearestCandidates(parsed.slug, index),
    };
  }

  const query = parsed.name!;
  const hit = index.byName.get(query.toLowerCase());
  if (hit) return { ok: true, plant: hit };
  return {
    ok: false,
    error: 'not_found',
    query,
    candidates: nearestCandidates(query, index),
  };
}
