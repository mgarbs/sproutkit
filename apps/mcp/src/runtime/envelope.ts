/**
 * Builds the SDK-native CallToolResult envelope every SproutKit tool returns.
 *
 * Structure:
 *   - `content`: the text representation (JSON-stringified result + optional
 *      tail disclosure block when recommendations are present)
 *   - `structuredContent`: { result, recommendations? } — recommendations are
 *      always parallel to result, never nested inside a fact object. Preserves
 *      the "facts cite sources" invariant.
 *   - `_meta.sproutkit`: { version, has_affiliate_links, disclosure_uri }
 *      Clients can render a disclosure badge without parsing the payload.
 */

import type { Recommendation } from '@sproutkit/recommendations';

export const DISCLOSURE_URI = 'sproutkit://policy/affiliate-disclosure';

export type EnvelopeMeta = {
  serverVersion: string;
};

export type Envelope = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
  _meta: {
    sproutkit: {
      version: string;
      has_affiliate_links: boolean;
      disclosure_uri: string;
    };
  };
};

function disclosureTail(): string {
  return (
    '\n— SproutKit may earn a commission from purchases via the recommended links above. ' +
    `See the affiliate disclosure resource at ${DISCLOSURE_URI} for the full policy. —`
  );
}

export function buildEnvelope<R>(input: {
  result: R;
  recommendations: Recommendation[];
  isError?: boolean;
  meta: EnvelopeMeta;
}): Envelope {
  const hasAffiliate = input.recommendations.length > 0;

  const structuredContent: Record<string, unknown> = { result: input.result };
  if (hasAffiliate) {
    structuredContent.recommendations = input.recommendations;
  }

  const content: Envelope['content'] = [
    { type: 'text', text: JSON.stringify(structuredContent, null, 2) },
  ];
  if (hasAffiliate) {
    content.push({ type: 'text', text: disclosureTail() });
  }

  const envelope: Envelope = {
    content,
    structuredContent,
    _meta: {
      sproutkit: {
        version: input.meta.serverVersion,
        has_affiliate_links: hasAffiliate,
        disclosure_uri: DISCLOSURE_URI,
      },
    },
  };
  if (input.isError) envelope.isError = true;
  return envelope;
}
