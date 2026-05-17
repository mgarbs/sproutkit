# @sproutkit/mcp

The AI-facing surface of SproutKit. A Model Context Protocol server that loads the curated plant dataset from `data/plants/` and exposes it to MCP clients (Claude Desktop, `mcp-cli`, custom clients) over stdio JSON-RPC.

## Tools exposed

| Tool | Description |
|---|---|
| `get_plant` | Look up a single plant by `slug` or by `name` (common or scientific, case-insensitive). Returns the full validated plant record, or a structured `not_found` result with the 3 closest candidates. |

More tools (`find_plants`, `companion_check`, `seasonal_calendar`, `get_playbook`) are in the [roadmap](../../ROADMAP.md).

## Run locally

From the repo root:

```bash
pnpm install
pnpm --filter @sproutkit/mcp dev
```

The server logs to stderr (`[sproutkit] loaded 10 plants ...` then `[sproutkit] connected on stdio`) and serves JSON-RPC on stdout. It does nothing visible until an MCP client connects.

## Smoke test

```bash
pnpm --filter @sproutkit/mcp smoke
```

Spawns the server in a subprocess, connects via `@modelcontextprotocol/sdk` stdio client, and asserts three lookup cases (slug hit, common-name hit, not-found with candidates). Use this to verify the end-to-end pipeline after any change to the server, tool, or data loader.

## Wire it into Claude Desktop

Add this block to `claude_desktop_config.json` (path is `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows). Replace `/absolute/path/to/sproutkit` with the path where you cloned this repo.

```json
{
  "mcpServers": {
    "sproutkit": {
      "command": "pnpm",
      "args": [
        "--filter",
        "@sproutkit/mcp",
        "dev"
      ],
      "cwd": "/absolute/path/to/sproutkit"
    }
  }
}
```

Restart Claude Desktop after editing the file. Once connected you can ask things like *"use sproutkit to look up brandywine tomato"* and the model will call `get_plant`.

### Pointing at a different dataset

Override the data directory with the `SPROUTKIT_DATA_DIR` environment variable — useful for forks that want to add their own plant entries without modifying the main `data/plants/` tree.

```json
{
  "mcpServers": {
    "sproutkit": {
      "command": "pnpm",
      "args": ["--filter", "@sproutkit/mcp", "dev"],
      "cwd": "/absolute/path/to/sproutkit",
      "env": {
        "SPROUTKIT_DATA_DIR": "/absolute/path/to/my-plants"
      }
    }
  }
}
```

## Layout

```
apps/mcp/
├─ src/
│  ├─ index.ts               server bootstrap, stdio transport, tool registry
│  ├─ data-loader.ts         walks SPROUTKIT_DATA_DIR (default: ../../data/plants),
│  │                         validates every YAML, fails loudly on bad data
│  └─ tools/
│     └─ get-plant.ts        slug/name lookup + Levenshtein candidates on miss
└─ scripts/
   └─ smoke-get-plant.ts     end-to-end MCP client/server smoke test
```
