#!/usr/bin/env tsx
/**
 * End-to-end smoke test for get_plant over real stdio JSON-RPC.
 *
 * Spawns `tsx src/index.ts`, connects with the MCP SDK's stdio client, and
 * asserts:
 *   1. lookup by slug          → returns tomato-brandywine
 *   2. lookup by common name   → returns the same plant
 *   3. lookup of bogus name    → not_found + candidate list
 *   4. envelope is well-formed → structuredContent.result present,
 *                                 no recommendations (lookup intent),
 *                                 _meta.sproutkit.has_affiliate_links === false,
 *                                 _meta.sproutkit.disclosure_uri set
 *
 * Run with: pnpm --filter @sproutkit/mcp smoke
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const serverEntry = resolve(here, '..', 'src', 'index.ts');

type ToolResponse = {
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
};

type GetPlantResult =
  | { ok: true; plant: { slug: string } }
  | { ok: false; error: string; query: string; candidates: string[] };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function unwrapResult(res: ToolResponse): GetPlantResult {
  const sc = res.structuredContent;
  assert(sc && typeof sc === 'object', 'expected structuredContent');
  const result = (sc as { result?: GetPlantResult }).result;
  assert(result !== undefined, 'expected structuredContent.result');
  return result;
}

function envelopeChecks(res: ToolResponse, label: string): void {
  assert(Array.isArray(res.content) && res.content.length >= 1, `${label}: content present`);
  const meta = res._meta as { sproutkit?: { has_affiliate_links: boolean; disclosure_uri: string } } | undefined;
  assert(meta?.sproutkit, `${label}: _meta.sproutkit present`);
  assert(typeof meta.sproutkit.has_affiliate_links === 'boolean', `${label}: has_affiliate_links boolean`);
  assert(
    meta.sproutkit.disclosure_uri === 'sproutkit://policy/affiliate-disclosure',
    `${label}: disclosure_uri set`,
  );
  // get_plant is intent: 'lookup' → recommendations off by default.
  assert(
    meta.sproutkit.has_affiliate_links === false,
    `${label}: lookup intent should not attach recommendations`,
  );
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      resolve(here, '..', '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      serverEntry,
    ],
  });

  const client = new Client(
    { name: 'sproutkit-smoke', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);

  // Case 1: slug lookup
  const bySlug = (await client.callTool({
    name: 'get_plant',
    arguments: { slug: 'tomato-brandywine' },
  })) as ToolResponse;
  envelopeChecks(bySlug, 'slug-case');
  const slugResult = unwrapResult(bySlug);
  assert(slugResult.ok === true, 'slug lookup should succeed');
  assert(slugResult.plant.slug === 'tomato-brandywine', 'slug lookup returned wrong plant');
  console.log('✓ slug lookup → tomato-brandywine');

  // Case 2: common-name lookup, case-insensitive
  const byName = (await client.callTool({
    name: 'get_plant',
    arguments: { name: 'Brandywine Tomato' },
  })) as ToolResponse;
  envelopeChecks(byName, 'name-case');
  const nameResult = unwrapResult(byName);
  assert(nameResult.ok === true, 'name lookup should succeed');
  assert(nameResult.plant.slug === 'tomato-brandywine', 'name lookup returned wrong plant');
  console.log('✓ name lookup → tomato-brandywine');

  // Case 3: not found with candidates
  const miss = (await client.callTool({
    name: 'get_plant',
    arguments: { name: 'tamato' },
  })) as ToolResponse;
  envelopeChecks(miss, 'miss-case');
  const missResult = unwrapResult(miss);
  assert(missResult.ok === false, 'bogus lookup should fail');
  assert(missResult.error === 'not_found', 'expected error=not_found');
  assert(
    Array.isArray(missResult.candidates) && missResult.candidates.length > 0,
    'expected candidates list',
  );
  console.log(`✓ not-found returns candidates: ${missResult.candidates.slice(0, 3).join(', ')}`);

  await client.close();
  console.log('\nAll smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
