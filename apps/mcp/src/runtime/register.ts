/**
 * The systemic chokepoint. Every SproutKit tool registers through this
 * wrapper instead of calling `McpServer.registerTool` directly. The wrapper:
 *
 *   1. Runs the tool's handler to get its raw result and an optional
 *      RecommendationContext (the tool tells us what it answered about).
 *   2. Calls the intent-gated recommender against the catalog.
 *   3. Builds the SDK-native envelope (structuredContent + content +
 *      _meta.sproutkit.has_affiliate_links + tail disclosure block).
 *
 * Tool authors never construct envelopes by hand and can't accidentally
 * omit disclosure when recommendations are present.
 */

import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  recommend,
  type Recommendation,
  type RecommendationContext,
  type RecommendationIntent,
} from '@sproutkit/recommendations';
import type { AffiliateConfig, Product } from '@sproutkit/schema';
import type { ZodTypeAny } from 'zod';

import { buildEnvelope, type Envelope, type EnvelopeMeta } from './envelope.js';

// Mirror the SDK's inference pattern so authors can declare inputSchema
// as a plain { fieldName: zodSchema } object and get typed args.
type ZodRawShape = Record<string, ZodTypeAny>;
type ShapeOutput<S extends ZodRawShape> = { [K in keyof S]: S[K]['_output'] };

export type SproutkitHandlerReturn<R> = {
  result: R;
  ctx?: Partial<Omit<RecommendationContext, 'intent'>>;
  isError?: boolean;
};

export type SproutkitToolDef<InputShape extends ZodRawShape, R> = {
  name: string;
  title?: string;
  description: string;
  intent: RecommendationIntent;
  inputSchema?: InputShape;
  handler: (args: ShapeOutput<InputShape>) => SproutkitHandlerReturn<R> | Promise<SproutkitHandlerReturn<R>>;
};

export type SproutkitRuntime = {
  catalog: readonly Product[];
  affiliateCfg: AffiliateConfig;
  meta: EnvelopeMeta;
};

export type SproutkitToolRegistrar = <InputShape extends ZodRawShape, R>(
  server: McpServer,
  def: SproutkitToolDef<InputShape, R>,
) => RegisteredTool;

export function createToolRegistrar(runtime: SproutkitRuntime): SproutkitToolRegistrar {
  return function registerSproutkitTool(server, def) {
    const inputSchema = def.inputSchema;
    const config = inputSchema
      ? { title: def.title, description: def.description, inputSchema }
      : { title: def.title, description: def.description };

    return server.registerTool(
      def.name,
      // The SDK accepts both inputSchema-present and inputSchema-absent shapes.
      config as Parameters<typeof server.registerTool>[1],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (args: any) => {
        const handlerResult = await def.handler(args);
        const recCtx: RecommendationContext = {
          intent: def.intent,
          tags: handlerResult.ctx?.tags ?? [],
          plant_slugs: handlerResult.ctx?.plant_slugs ?? [],
          explicit_product_slugs: handlerResult.ctx?.explicit_product_slugs ?? [],
        };
        const recommendations: Recommendation[] = recommend(
          recCtx,
          runtime.catalog,
          runtime.affiliateCfg,
        );
        const envelope: Envelope = buildEnvelope({
          result: handlerResult.result,
          recommendations,
          isError: handlerResult.isError,
          meta: runtime.meta,
        });
        return envelope;
      }) as Parameters<typeof server.registerTool>[2],
    );
  };
}
