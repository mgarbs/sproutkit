/**
 * SproutKit MCP server entry point.
 *
 * Loads the plant + product dataset once at startup (failing loudly on any
 * invalid file), reads the deployment's affiliate config from env, registers
 * tools via the systemic envelope wrapper, and connects over stdio.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadAffiliateConfig } from '@sproutkit/schema';

import { loadDataset, resolveDataRoot } from './data-loader.js';
import { createToolRegistrar } from './runtime/register.js';
import { registerPolicyResources, SERVER_INSTRUCTIONS } from './runtime/resources.js';
import { getPlant, getPlantInputShape } from './tools/get-plant.js';

const SERVER_NAME = 'sproutkit';
const SERVER_VERSION = '0.1.0';

/**
 * Canonical SproutKit deployment defaults. Used when the corresponding env
 * var is unset. SPROUTKIT_DISABLE_RECOMMENDATIONS=1 still overrides these.
 * Forks should replace this object in their own bootstrap with their own
 * affiliate tags — that's the one and only knob to turn.
 */
const SPROUTKIT_AFFILIATE_DEFAULTS = {
  amazon: 'sproutkit-20',
} as const;

async function main(): Promise<void> {
  const dataRoot = await resolveDataRoot();
  const dataset = await loadDataset(dataRoot);
  const affiliateCfg = loadAffiliateConfig(process.env, SPROUTKIT_AFFILIATE_DEFAULTS);

  // stderr is fine — stdout is reserved for the MCP JSON-RPC stream.
  console.error(
    `[sproutkit] loaded ${dataset.plants.all.length} plants and ${dataset.products.length} products from ${dataRoot}`,
  );
  if (affiliateCfg.disabled) {
    console.error(
      '[sproutkit] recommendations disabled (SPROUTKIT_DISABLE_RECOMMENDATIONS=1)',
    );
  } else {
    console.error(
      `[sproutkit] affiliate networks active: ${affiliateCfg.configuredNetworks.join(', ')}`,
    );
    if (affiliateCfg.unconfiguredNetworks.length > 0) {
      console.error(
        `[sproutkit] note: unconfigured networks will be skipped: ${affiliateCfg.unconfiguredNetworks.join(', ')}`,
      );
    }
  }

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  registerPolicyResources(server, affiliateCfg);

  const registerSproutkitTool = createToolRegistrar({
    catalog: dataset.products,
    affiliateCfg,
    meta: { serverVersion: SERVER_VERSION },
  });

  registerSproutkitTool(server, {
    name: 'get_plant',
    title: 'Get plant',
    description:
      'Look up a single plant by slug (e.g. "tomato-brandywine") or by name. ' +
      'Returns the full validated plant record on hit, or a structured not_found ' +
      'result with the 3 closest candidates.',
    intent: 'lookup',
    inputSchema: getPlantInputShape,
    handler: (args) => {
      const result = getPlant(args, dataset.plants);
      return { result, isError: !result.ok };
    },
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[sproutkit] connected on stdio');
}

main().catch((e) => {
  console.error('[sproutkit] fatal:', e);
  process.exit(1);
});
