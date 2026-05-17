/**
 * SproutKit MCP server entry point.
 *
 * Loads the plant dataset once at startup (failing loudly on any invalid
 * file), registers tools, and connects over stdio. Stdio is what Claude
 * Desktop and `mcp-cli` speak — HTTP/SSE is a P2 concern.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadPlants, resolveDefaultDataDir } from './data-loader.js';
import { getPlant, getPlantInputShape } from './tools/get-plant.js';

const SERVER_NAME = 'sproutkit';
const SERVER_VERSION = '0.1.0';

async function main(): Promise<void> {
  const dataDir = resolveDefaultDataDir();
  const index = await loadPlants(dataDir);
  // stderr is fine — stdout is reserved for the MCP JSON-RPC stream.
  console.error(`[sproutkit] loaded ${index.all.length} plants from ${dataDir}`);

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'get_plant',
    {
      title: 'Get plant',
      description:
        'Look up a single plant by slug (e.g. "tomato-brandywine") or by name. ' +
        'Returns the full validated plant record on hit, or a structured not_found ' +
        'result with the 3 closest candidates.',
      inputSchema: getPlantInputShape,
    },
    async (args) => {
      const result = getPlant(args, index);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.ok,
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[sproutkit] connected on stdio');
}

main().catch((e) => {
  console.error('[sproutkit] fatal:', e);
  process.exit(1);
});
