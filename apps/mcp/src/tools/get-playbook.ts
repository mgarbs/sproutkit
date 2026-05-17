/**
 * get_playbook — fetch a curated how-to guide by slug or topic.
 *
 * Returns the full validated Playbook on hit, or a structured not-found
 * result carrying up to 5 candidates by topic.
 *
 * Intent is `playbook` — the systemic wrapper passes the playbook's
 * `recommended_products` as `ctx.explicit_product_slugs`, so the matcher
 * uses the curated bundle instead of falling back to tag overlap.
 */

import type { Playbook } from '@sproutkit/schema';
import { z } from 'zod';

export const getPlaybookInputShape = {
  slug: z.string().optional().describe('Exact playbook slug, e.g. "raised-bed-build".'),
  topic: z
    .string()
    .optional()
    .describe(
      'Natural-language topic, e.g. "raised garden bed", "fall garlic", "season extension". ' +
        'Used when slug is not provided. Matched case-insensitively against playbook topic, title, and tags.',
    ),
} as const;

const InputSchema = z.object(getPlaybookInputShape).refine(
  (v) => Boolean(v.slug ?? v.topic),
  { message: 'Provide either slug or topic.' },
);

export type GetPlaybookInput = z.infer<typeof InputSchema>;

export type PlaybookCandidate = { slug: string; topic: string; title: string };

export type GetPlaybookResult =
  | { ok: true; playbook: Playbook }
  | { ok: false; error: 'not_found'; query: string; candidates: PlaybookCandidate[] };

export type PlaybookIndex = {
  bySlug: Map<string, Playbook>;
  all: Playbook[];
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function scoreMatch(pb: Playbook, queryTokens: string[]): number {
  const corpus = [pb.topic, pb.title, pb.slug, ...pb.tags].join(' ').toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (corpus.includes(t)) score += 1;
  }
  return score;
}

function candidatesFor(index: PlaybookIndex, query: string): PlaybookCandidate[] {
  const queryTokens = tokenize(query);
  const ranked = index.all
    .map((pb) => ({ pb, score: scoreMatch(pb, queryTokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return ranked.map(({ pb }) => ({ slug: pb.slug, topic: pb.topic, title: pb.title }));
}

export function getPlaybook(input: GetPlaybookInput, index: PlaybookIndex): GetPlaybookResult {
  const parsed = InputSchema.parse(input);

  if (parsed.slug) {
    const hit = index.bySlug.get(parsed.slug);
    if (hit) return { ok: true, playbook: hit };
    return {
      ok: false,
      error: 'not_found',
      query: parsed.slug,
      candidates: candidatesFor(index, parsed.slug),
    };
  }

  const query = parsed.topic!;
  const q = query.toLowerCase();

  // Exact topic/title match first.
  for (const pb of index.all) {
    if (pb.topic.toLowerCase() === q || pb.title.toLowerCase() === q) {
      return { ok: true, playbook: pb };
    }
  }

  // Token-overlap fuzzy match, requires at least one token hit.
  const queryTokens = tokenize(query);
  let best: { pb: Playbook; score: number } | null = null;
  for (const pb of index.all) {
    const score = scoreMatch(pb, queryTokens);
    if (score > 0 && (!best || score > best.score)) {
      best = { pb, score };
    }
  }
  if (best) return { ok: true, playbook: best.pb };

  return {
    ok: false,
    error: 'not_found',
    query,
    candidates: candidatesFor(index, query),
  };
}
