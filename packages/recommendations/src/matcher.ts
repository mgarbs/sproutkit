import {
  buildAffiliateUrl,
  type AffiliateConfig,
  type Product,
} from '@sproutkit/schema';

import type { Recommendation, RecommendationContext } from './types.js';

const CAP_BY_INTENT: Record<RecommendationContext['intent'], number> = {
  lookup: 0,
  'product-adjacent': 3,
  'purchase-implied': 5,
  playbook: 5,
};

type ScoredProduct = {
  product: Product;
  score: number;
  matchedTags: string[];
  matchReason: 'explicit' | 'tag-overlap';
};

function pickViableTarget(product: Product, cfg: AffiliateConfig) {
  for (const target of product.affiliate_targets) {
    if (cfg.tags[target.network]) {
      const url = buildAffiliateUrl(target, cfg);
      if (url) return { target, url };
    }
  }
  return null;
}

function summarizeRationale(matchedTags: string[], matchReason: ScoredProduct['matchReason']): string {
  if (matchReason === 'explicit') {
    return 'curated bundle for this playbook';
  }
  if (matchedTags.length === 0) return 'general match';
  return `matched tags: ${matchedTags.join(', ')}`;
}

/**
 * Pure function: given a context and the full catalog, return up to N
 * recommendations honoring the intent gate. Never mutates inputs.
 *
 * The function is deliberately small and synchronous so it can be
 * exercised by tests without any IO. The data-loader hands it a fully
 * validated `Product[]` and the env-driven `AffiliateConfig`.
 */
export function recommend(
  ctx: RecommendationContext,
  catalog: readonly Product[],
  cfg: AffiliateConfig,
): Recommendation[] {
  if (cfg.disabled) return [];
  const cap = CAP_BY_INTENT[ctx.intent];
  if (cap === 0 && ctx.explicit_product_slugs.length === 0) return [];

  const ctxTags = new Set<string>(ctx.tags);
  const explicitSet = new Set<string>(ctx.explicit_product_slugs);
  const scored = new Map<string, ScoredProduct>();

  // Explicit picks always win and short-circuit ranking.
  for (const product of catalog) {
    if (explicitSet.has(product.slug)) {
      scored.set(product.slug, {
        product,
        score: Number.MAX_SAFE_INTEGER,
        matchedTags: [],
        matchReason: 'explicit',
      });
    }
  }

  // Tag-overlap scoring for the rest, only if intent permits it.
  if (ctx.intent !== 'lookup') {
    for (const product of catalog) {
      if (scored.has(product.slug)) continue;
      const matched = product.tags.filter((t) => ctxTags.has(t));
      if (matched.length === 0) continue;
      scored.set(product.slug, {
        product,
        score: matched.length,
        matchedTags: matched,
        matchReason: 'tag-overlap',
      });
    }
  }

  const ranked = [...scored.values()].sort((a, b) => b.score - a.score);
  const out: Recommendation[] = [];

  for (const entry of ranked) {
    if (out.length >= cap && entry.matchReason !== 'explicit') break;
    const picked = pickViableTarget(entry.product, cfg);
    if (!picked) continue;
    out.push({
      product_slug: entry.product.slug,
      name: entry.product.name,
      category: entry.product.category,
      url: picked.url,
      network: picked.target.network,
      rationale: summarizeRationale(entry.matchedTags, entry.matchReason),
      sources: entry.product.sources.map((s) => ({
        title: s.title,
        url: s.url,
        publisher: s.publisher,
      })),
      affiliate: true,
    });
  }

  return out;
}
