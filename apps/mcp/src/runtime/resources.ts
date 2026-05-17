/**
 * MCP resources served by the SproutKit server.
 *
 * Today: a single canonical affiliate-disclosure resource at
 * `sproutkit://policy/affiliate-disclosure`. Clients can render this as a
 * dedicated card; the envelope's `_meta.sproutkit.disclosure_uri` points at it.
 *
 * Later (P2): per-product pages at `sproutkit://products/<slug>` and a
 * dataset-license page.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AffiliateConfig } from '@sproutkit/schema';

import { DISCLOSURE_URI } from './envelope.js';

export const SERVER_INSTRUCTIONS = [
  'SproutKit is an open, source-cited gardening knowledge base.',
  '',
  'Affiliate disclosure: some tool responses include product recommendations',
  'whose links are affiliate links. SproutKit may earn a commission from',
  'purchases made through these links. Every response is flagged via',
  '`_meta.sproutkit.has_affiliate_links: boolean`. The full disclosure policy',
  `is available as an MCP resource at ${DISCLOSURE_URI}.`,
  '',
  'Recommendations are intent-gated — informational lookups like `get_plant`',
  'do not attach affiliate links. Only tools whose declared intent implies a',
  'purchase decision will surface them, and always with disclosure.',
].join('\n');

function disclosureBody(cfg: AffiliateConfig): string {
  const configured =
    cfg.configuredNetworks.length > 0
      ? cfg.configuredNetworks.join(', ')
      : '(none — recommendations disabled in this deployment)';

  return [
    '# SproutKit Affiliate Disclosure',
    '',
    'SproutKit participates in affiliate programs. When a tool response surfaces a',
    'product recommendation, the linked product page may include a tracking',
    "parameter identifying the SproutKit deployment's account. If you click such a",
    'link and make a purchase, SproutKit may earn a commission at no additional',
    'cost to you.',
    '',
    '## Configured affiliate networks in this deployment',
    '',
    `- ${configured}`,
    '',
    '## How recommendations are chosen',
    '',
    'Products are matched to your query by a controlled tag vocabulary and',
    'intent-gated by the tool that answered. Informational lookups (e.g.',
    '`get_plant`) never attach recommendations. Tools whose purpose is purchase-',
    'adjacent — playbooks, amendment selectors, seasonal planning — may surface',
    'up to five recommendations per response, each with its own cited rationale.',
    '',
    '## How to identify affiliate content',
    '',
    'Every response that includes recommendations sets',
    '`_meta.sproutkit.has_affiliate_links` to `true` and appends a disclosure',
    "block to the response's content. Each recommendation object carries an",
    '`affiliate: true` field and a `rationale` describing the match.',
    '',
    '## Open-source positioning',
    '',
    'The product catalog itself is open data (CC-BY-SA 4.0) and lives at',
    '`data/products/` in the SproutKit repository. Anyone can fork SproutKit',
    'and run their own deployment with their own affiliate tags. See',
    'TRADEMARK.md for brand-name reservation.',
    '',
    'For the full policy, governance, and contribution rules, see',
    'https://github.com/mgarbs/sproutkit',
  ].join('\n');
}

export function registerPolicyResources(
  server: McpServer,
  cfg: AffiliateConfig,
): void {
  server.registerResource(
    'sproutkit-affiliate-disclosure',
    DISCLOSURE_URI,
    {
      title: 'SproutKit affiliate disclosure',
      description: 'Canonical disclosure for any tool response that includes affiliate product recommendations.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: DISCLOSURE_URI,
          mimeType: 'text/markdown',
          text: disclosureBody(cfg),
        },
      ],
    }),
  );
}
