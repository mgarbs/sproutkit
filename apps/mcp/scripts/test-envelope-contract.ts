#!/usr/bin/env tsx
/**
 * Envelope contract test.
 *
 * Boots the server, lists every registered tool, and calls each with a
 * known-good input. Asserts that the response conforms to the SproutKit
 * envelope contract:
 *   - has a non-empty `content` array
 *   - has `structuredContent.result` (the tool's payload, never bare)
 *   - has `_meta.sproutkit.{ version, has_affiliate_links, disclosure_uri }`
 *
 * This is how "systemic" stays true after the fourth contributor. Any tool
 * registered without going through `registerSproutkitTool` will trip this.
 *
 * Adding a new tool: append a smoke input to TOOL_INPUTS.
 *
 * Also asserts the affiliate-disclosure RESOURCE returns markdown content,
 * so the `_meta.sproutkit.disclosure_uri` actually resolves.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const serverEntry = resolve(here, '..', 'src', 'index.ts');

const TOOL_INPUTS: Record<string, Record<string, unknown>> = {
  get_plant: { slug: 'tomato-brandywine' },
};

type ToolResponse = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Contract violation: ${msg}`);
}

function assertEnvelope(toolName: string, res: ToolResponse): void {
  assert(Array.isArray(res.content) && res.content.length > 0, `${toolName}: content must be non-empty array`);
  assert(res.content[0]?.type === 'text', `${toolName}: first content block must be text`);

  assert(
    res.structuredContent && typeof res.structuredContent === 'object',
    `${toolName}: structuredContent must be present`,
  );
  assert(
    'result' in res.structuredContent,
    `${toolName}: structuredContent.result must be present`,
  );

  const meta = res._meta as { sproutkit?: { version: string; has_affiliate_links: boolean; disclosure_uri: string } } | undefined;
  assert(meta?.sproutkit, `${toolName}: _meta.sproutkit must be present`);
  assert(typeof meta.sproutkit.version === 'string' && meta.sproutkit.version.length > 0, `${toolName}: _meta.sproutkit.version must be set`);
  assert(typeof meta.sproutkit.has_affiliate_links === 'boolean', `${toolName}: _meta.sproutkit.has_affiliate_links must be boolean`);
  assert(
    meta.sproutkit.disclosure_uri === 'sproutkit://policy/affiliate-disclosure',
    `${toolName}: _meta.sproutkit.disclosure_uri must be canonical`,
  );

  // If recommendations are claimed, the structuredContent must echo them.
  if (meta.sproutkit.has_affiliate_links) {
    assert(
      Array.isArray((res.structuredContent as { recommendations?: unknown[] }).recommendations) &&
        (res.structuredContent as { recommendations: unknown[] }).recommendations.length > 0,
      `${toolName}: has_affiliate_links=true but no recommendations in structuredContent`,
    );
  }
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
    { name: 'sproutkit-contract', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);

  const { tools } = await client.listTools();
  assert(tools.length > 0, 'server must register at least one tool');

  for (const tool of tools) {
    const args = TOOL_INPUTS[tool.name];
    assert(args !== undefined, `no smoke input registered for tool "${tool.name}" — add one to TOOL_INPUTS`);
    const res = (await client.callTool({ name: tool.name, arguments: args })) as ToolResponse;
    assertEnvelope(tool.name, res);
    console.log(`✓ ${tool.name} returns valid envelope`);
  }

  // Resource contract: disclosure resource must resolve.
  const disclosure = await client.readResource({ uri: 'sproutkit://policy/affiliate-disclosure' });
  assert(Array.isArray(disclosure.contents) && disclosure.contents.length > 0, 'disclosure resource must return content');
  const first = disclosure.contents[0]!;
  assert(first.mimeType === 'text/markdown', 'disclosure resource must be text/markdown');
  assert('text' in first, 'disclosure resource must use text (not blob) content');
  assert(typeof first.text === 'string' && first.text.includes('Affiliate Disclosure'), 'disclosure body must contain title');
  console.log('✓ affiliate-disclosure resource resolves to markdown');

  await client.close();
  console.log(`\n✓ contract checks passed for ${tools.length} tool(s) + disclosure resource`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
